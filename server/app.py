from flask import Flask, request, jsonify
import numpy as np
import librosa
from tensorflow.keras.models import load_model
import logging
import os
from flask_cors import CORS
import time
import whisper

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Parameters
SAMPLE_RATE = 16000
CHUNK_DURATION = 1.0  # seconds
FRAME_LENGTH = 512
HOP_LENGTH = 128
N_MFCC = 13
TARGET_FRAMES = 86
THRESHOLD = 0.7

# Paths
model_path = r'model\stammer_detector_optimized2.h5'  # Update with your model path

# Load the model
logger.info("Loading model...")
model = load_model(model_path)

# Load Whisper model
logger.info("Loading Whisper model...")
whisper_model = whisper.load_model("base")  # Use 'base' for efficiency; can use 'small' or 'medium' for better accuracy

# Function to apply basic noise reduction
def reduce_noise(audio, sr=SAMPLE_RATE):
    noise_clip = audio[:int(sr * 0.5)]
    noise_spec = librosa.stft(noise_clip, n_fft=FRAME_LENGTH, hop_length=HOP_LENGTH)
    noise_mag = np.mean(np.abs(noise_spec), axis=1, keepdims=True)
    audio_spec = librosa.stft(audio, n_fft=FRAME_LENGTH, hop_length=HOP_LENGTH)
    audio_mag, audio_phase = librosa.magphase(audio_spec)
    audio_mag_clean = np.maximum(audio_mag - noise_mag, 0)
    audio_clean_spec = audio_mag_clean * audio_phase
    audio_clean = librosa.istft(audio_clean_spec, hop_length=HOP_LENGTH, length=len(audio))
    return audio_clean

# Function to preprocess audio
def preprocess_audio(audio, sr=SAMPLE_RATE):
    audio = reduce_noise(audio, sr)
    chunk_size = int(CHUNK_DURATION * sr)
    hop_size = HOP_LENGTH
    num_chunks = (len(audio) - chunk_size) // hop_size + 1
    features = []
    
    for i in range(num_chunks):
        start = i * hop_size
        end = start + chunk_size
        chunk = audio[start:end]
        if len(chunk) == chunk_size:
            mfcc = librosa.feature.mfcc(
                y=chunk, sr=sr, n_mfcc=N_MFCC,
                n_fft=FRAME_LENGTH, hop_length=HOP_LENGTH
            ).T
            if mfcc.shape[0] < TARGET_FRAMES:
                mfcc = np.pad(mfcc, ((0, TARGET_FRAMES - mfcc.shape[0]), (0, 0)), mode='constant')
            elif mfcc.shape[0] > TARGET_FRAMES:
                mfcc = mfcc[:TARGET_FRAMES]
            
            delta_mfcc = librosa.feature.delta(mfcc, axis=0)
            energy = librosa.feature.rms(y=chunk, frame_length=FRAME_LENGTH, hop_length=HOP_LENGTH).T
            if energy.shape[0] < TARGET_FRAMES:
                energy = np.pad(energy, ((0, TARGET_FRAMES - energy.shape[0]), (0, 0)), mode='constant')
            elif energy.shape[0] > TARGET_FRAMES:
                energy = energy[:TARGET_FRAMES]
            
            pause_threshold = np.percentile(energy, 10)
            pause_duration = (energy < pause_threshold).astype(float)
            energy_variance = np.var(energy, axis=0, keepdims=True)
            energy_variance = np.repeat(energy_variance, TARGET_FRAMES, axis=0)
            pitch_proxy = np.mean(mfcc[:, 1:3], axis=1, keepdims=True)
            
            combined = np.concatenate(
                [mfcc, delta_mfcc, pause_duration, energy_variance, pitch_proxy],
                axis=1
            )
            features.append(combined)
    return np.array(features), num_chunks

# Function to predict on audio data
def predict_stammer(features):
    if len(features) == 0:
        return []
    predictions = model.predict(features, verbose=0)
    predictions_binary = (predictions > THRESHOLD).astype(int).flatten()
    confidences = predictions.flatten()
    return list(zip(predictions_binary, confidences))

# Function to smooth predictions
def smooth_predictions(predictions, window_size=3):
    smoothed = []
    for i in range(len(predictions)):
        start = max(0, i - window_size // 2)
        end = min(len(predictions), i + window_size // 2 + 1)
        window = [pred[0] for pred in predictions[start:end]]
        smoothed_pred = 1 if sum(window) > len(window) // 2 else 0
        smoothed.append((smoothed_pred, predictions[i][1]))
    return smoothed

# Function to group consecutive chunks into time ranges
def group_consecutive_chunks(predictions, audio_duration, hop_time):
    if len(predictions) == 0:
        return []
    
    ranges = []
    current_label = predictions[0][0]
    start_idx = 0
    current_confidences = [predictions[0][1]]
    chunk_indices = [0]
    
    for i in range(1, len(predictions)):
        if predictions[i][0] == current_label:
            current_confidences.append(predictions[i][1])
            chunk_indices.append(i)
        else:
            start_time = min(start_idx * hop_time, audio_duration)
            end_time = min((start_time + CHUNK_DURATION), audio_duration)
            avg_confidence = np.mean(current_confidences)
            label = "Stammered" if current_label == 1 else "Fluent"
            ranges.append((start_time, end_time, label, avg_confidence, chunk_indices))
            current_label = predictions[i][0]
            start_idx = i
            current_confidences = [predictions[i][1]]
            chunk_indices = [i]
    
    # Handle the last range
    start_time = min(start_idx * hop_time, audio_duration)
    end_time = min((start_time + CHUNK_DURATION), audio_duration)
    avg_confidence = np.mean(current_confidences)
    label = "Stammered" if current_label == 1 else "Fluent"
    ranges.append((start_time, end_time, label, avg_confidence, chunk_indices))
    
    return ranges

# Generate report
def generate_report(ranges, total_chunks, audio_duration, transcription):
    stammered_chunks = 0
    fluent_chunks = 0
    stammered_periods = []
    
    for start_time, end_time, label, avg_conf, chunk_indices in ranges:
        num_chunks_in_range = len(chunk_indices)
        if label == "Stammered":
            stammered_periods.append(f"{start_time:.1f}-{end_time:.1f}s")
            stammered_chunks += num_chunks_in_range
        else:
            fluent_chunks += num_chunks_in_range
    
    stammer_rate = (stammered_chunks / total_chunks) * 100 if total_chunks > 0 else 0
    severity = "Low" if stammer_rate < 30 else "Moderate" if stammer_rate <= 65 else "High"
    
    recommendations = {
        "Low": [
            "Continue practicing fluent speech patterns.",
            "Engage in regular reading aloud exercises.",
        ],
        "Moderate": [
            "Practice slow and deliberate speech exercises.",
            "Use breathing techniques to reduce stammering.",
            "Consider consulting a speech therapist.",
        ],
        "High": [
            "Work with a speech therapist for personalized guidance.",
            "Practice pausing techniques during speech.",
            "Use mindfulness exercises to reduce anxiety.",
        ],
    }
    
    return {
        "date": time.strftime("%Y-%m-%d"),
        "stammeredPeriods": stammered_periods if stammered_periods else ["None"],
        "stammeredChunks": stammered_chunks,
        "fluentChunks": fluent_chunks,
        "stammerRate": f"{stammer_rate:.2f}%",
        "audioDuration": f"{audio_duration:.1f}s",
        "severity": severity,
        "recommendations": recommendations[severity],
        "transcription": transcription
    }

@app.route('/analyze', methods=['POST'])
def analyze_audio():
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
    
    audio_file = request.files['audio']
    filename = audio_file.filename.lower()
    
    # Validate file extension
    if not (filename.endswith('.wav') or filename.endswith('.mp3')):
        return jsonify({"error": "Unsupported file format. Please upload a WAV or MP3 file."}), 400
    
    # Use appropriate extension for temp file
    temp_ext = '.mp3' if filename.endswith('.mp3') else '.wav'
    temp_path = f"temp_audio{temp_ext}"
    audio_file.save(temp_path)
    
    try:
        # Transcribe audio with Whisper
        logger.info("Transcribing audio with Whisper...")
        whisper_result = whisper_model.transcribe(temp_path, language="en")
        transcription = whisper_result["text"].strip()
        
        # Load and process audio for stammer analysis
        audio, sr = librosa.load(temp_path, sr=SAMPLE_RATE)
        audio_duration = len(audio) / sr
        features, num_chunks = preprocess_audio(audio, sr)
        
        if len(features) == 0:
            return jsonify({"error": "No chunks extracted from audio"}), 400
        
        # Predict and generate report
        predictions = predict_stammer(features)
        smoothed_predictions = smooth_predictions(predictions)
        hop_time = HOP_LENGTH / sr
        time_ranges = group_consecutive_chunks(smoothed_predictions, audio_duration, hop_time)
        report = generate_report(time_ranges, num_chunks, audio_duration, transcription)
        
        return jsonify(report)
    
    except Exception as e:
        logger.error(f"Error processing audio: {str(e)}")
        return jsonify({"error": "Failed to process audio"}), 500
    
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

if __name__ == '__main__':
    app.run(debug=True, port=5000)