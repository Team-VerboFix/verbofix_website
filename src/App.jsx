import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import './App.css';
import Navbar from './components/Navbar';
import leftImage from './assets/agent.png';
import centerImage from './assets/laptop.png';
import rightImage from './assets/user.png';

// Import your page components
import Login from './pages/Login';
import Signup from './pages/Signup';
import UserHome from './pages/UserHome';
import SpeakerHome from './pages/SpeakerHome';
import SpeakerSessionPage from './pages/SpeakerSessionPage';
import UserSessionPage from './pages/UserSessionPage';
import UserReportPage from './pages/UserReportPage';
import UserStammerAnalysisPage from './pages/UserStammerAnalysisPage';

function App() {
  return (
    <Router>
      <Navbar />
      <div className="mt-[120px]"> {/* Adjust top margin to avoid overlap with fixed navbar */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/user-home" element={<UserHome />} />
          <Route path="/speaker-home" element={<SpeakerHome />} />
          <Route path="/speaker-home/session" element={<SpeakerSessionPage />} />
          <Route path="/user-home/session" element={<UserSessionPage />} />
          <Route path="/user-home/report" element={<UserReportPage />} />
          <Route path="/user-home/stammer-analysis" element={<UserStammerAnalysisPage />} />
          {/* Add more routes as needed */}
        </Routes>
      </div>
    </Router>
  );
}

// Home Component (Landing Page)
function Home() {
  const navigate = useNavigate();

  return (
    <div>
      
      {/* Centered Heading & Subtext */}
      <div className="text-center mt-8">
        <h2 className="text-3xl font-poppins font-extrabold text-dark">
          What Role do You Want to Play?
        </h2>
        <p className="text-lg text-gray-500 font-poppins mt-2">
          Take your step into our revolution in Speech Therapy
        </p>
      </div>

      {/* Image Section with Connecting Line */}
      <div className="relative flex items-center justify-center mt-8">
        <div className="absolute w-1/2 border-t-4 border-gray-500 top-1/2 z-0"></div>

        {/* Left Image & Button */}
        <div className="flex flex-col items-center z-1">
          <img src={leftImage} alt="Helper" className="w-56 h-56 drop-shadow-xl hover:scale-102 transition" />
          <button 
            className="bg-light border-2 text-center text-dark font-poppins shadow-md font-semibold px-6 py-3 rounded-md mt-4 text-lg hover:bg-dark hover:text-light transition"
            onClick={() => navigate("/login", { state: { role: "Speaker" } })}
          >
            I'm here to Help
          </button>
        </div>

        {/* Center Image */}
        <div className="flex flex-col items-center mx-12 z-1">
          <img src={centerImage} alt="VerboFix" className="w-64 h-64 mb-8 drop-shadow-xl hover:scale-102 transition" />
        </div>

        {/* Right Image & Button */}
        <div className="flex flex-col items-center z-1">
          <img src={rightImage} alt="User" className="w-56 h-56 drop-shadow-xl hover:scale-102 transition" />
          <button 
            className="bg-light border-2 text-center text-dark font-poppins font-semibold px-6 py-3 rounded-md mt-4 text-lg shadow-md hover:bg-dark hover:text-light transition"
            onClick={() => navigate("/login", { state: { role: "User" } })}
          >
            I Need Help
          </button>
        </div>
      </div>

      {/* Benefits Section */}
      <div className='flex justify-center items-center gap-60 mt-10'>
        <div className='bg-none w-88 h-auto p-2 rounded-sm'>
          <h1 className='text-dark text-2xl font-poppins font-bold'>TalkMate Benefits</h1>
          <p className='my-3 px-4 py-2 text-dark font-poppins font-semibold text-primary bg-white drop-shadow-sm border-1 hover:scale-103 hover:drop-shadow-xl transition'><p className='text-lg text-dark font-poppins font-semibold'> Increased Empathy & Awareness </p> They gain understanding about stuttering and how to communicate effectively.</p>
          <p className='my-3 px-4 py-2 text-dark font-poppins font-semibold text-primary bg-white drop-shadow-sm border-1 hover:scale-103 hover:drop-shadow-xl transition'><p className='text-lg text-dark font-poppins font-semibold'> Skill Development </p>  Those interested in speech therapy, psychology, or coaching can gain hands-on experience.</p>
          <p className='my-3 px-4 py-2 text-dark font-poppins font-semibold text-primary bg-white drop-shadow-sm border-1 hover:scale-103 hover:drop-shadow-xl transition'><p className='text-lg text-dark font-poppins font-semibold'> Revenue Generation</p>  Make some money in your time of leisure.</p>
        </div>
        <div className='bg-none w-90 h-auto p-2 rounded-sm'>
          <h1 className='text-dark text-2xl font-poppins font-bold'>User Benefits</h1>
          <p className='my-3 px-4 py-2 text-dark font-poppins font-semibold text-primary bg-white drop-shadow-sm border-1 hover:scale-103 hover:drop-shadow-xl transition'><p className='text-lg text-dark font-poppins font-semibold'>Improved Fluency & Confidence</p> Regular conversations help them practice speech in a low-pressure environment.</p>
          <p className='my-3 px-4 py-2 text-dark font-poppins font-semibold text-primary bg-white drop-shadow-sm border-1 hover:scale-103 hover:drop-shadow-xl transition'><p className='text-lg text-dark font-poppins font-semibold'> Social Connection</p> Helps break social isolation and allows them to build friendships.</p>
          <p className='my-3 px-4 py-2 text-dark font-poppins font-semibold text-primary bg-white drop-shadow-sm border-1 hover:scale-103 hover:drop-shadow-xl transition'><p className='text-lg text-dark font-poppins font-semibold'>  Reduced Anxiety </p> Speaking with understanding individuals can ease the fear of judgment.</p>
        </div>
      </div>
    </div>
  );
}

export default App;
