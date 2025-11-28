import React, { useState } from "react";
import { Star } from "lucide-react";

export default function FeedbackModal({ visible, onSubmit, onClose, role }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md">
        <h3 className="text-xl font-semibold mb-2 text-center">
          {role === "speaker" ? "Rate your user" : "Rate your speaker"}
        </h3>
        <p className="text-gray-500 text-center mb-4">How was the call experience?</p>

        {/* stars */}
        <div className="flex justify-center mb-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              size={28}
              className={`cursor-pointer ${
                rating >= star ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
              }`}
              onClick={() => setRating(star)}
            />
          ))}
        </div>

        <textarea
          className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring focus:ring-indigo-200"
          rows={3}
          placeholder="Write your feedback..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit({ rating, comment })}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
