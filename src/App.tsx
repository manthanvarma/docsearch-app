import React, { useState, useEffect } from 'react';
import { Search, MapPin, Star, Phone, Clock, ChevronLeft, Filter, Stethoscope, User, Info, Mail, Building, IndianRupee, Calendar, Check, X, Trash2, ArrowRight, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { Doctor, View, Patient, Appointment } from './types';

export default function App() {
  const [view, setView] = useState<View>('landing');
  const [patient, setPatient] = useState<Patient | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [bookingData, setBookingData] = useState({
    patientName: '',
    date: '',
    time: ''
  });
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  // Auto-clear feedback after 3 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);
  
  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [specialization, setSpecialization] = useState('All');
  const [location, setLocation] = useState('All');
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isSpecOpen, setIsSpecOpen] = useState(false);

  const [isUpdatingAvatars, setIsUpdatingAvatars] = useState(false);

  // Update doctor avatars if they are still using placeholders
  useEffect(() => {
    const updateAvatars = async () => {
      if (doctors.length === 0 || isUpdatingAvatars) return;
      
      const needsUpdate = doctors.some(d => d.image.includes('dicebear.com'));
      if (!needsUpdate) return;

      setIsUpdatingAvatars(true);
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
        
        const malePrompt = "Modern flat avatar of a male doctor, soft gradient background, minimal face features, white coat with stethoscope, clean UI style, circular frame, subtle shadow, pastel colors, professional healthcare theme";
        const femalePrompt = "Modern flat avatar of a female doctor, soft gradient background, minimal face features, white coat with stethoscope, clean UI style, circular frame, subtle shadow, pastel colors, professional healthcare theme";

        console.log("Generating new doctor avatars...");
        
        const [maleRes, femaleRes] = await Promise.all([
          ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: malePrompt }] },
          }),
          ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: femalePrompt }] },
          })
        ]);

        let maleImage = "";
        let femaleImage = "";

        for (const part of maleRes.candidates[0].content.parts) {
          if (part.inlineData) {
            maleImage = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }

        for (const part of femaleRes.candidates[0].content.parts) {
          if (part.inlineData) {
            femaleImage = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }

        if (maleImage && femaleImage) {
          const response = await fetch('/api/update-doctor-images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ maleImage, femaleImage })
          });
          
          if (response.ok) {
            console.log("Doctor avatars updated successfully");
            // Refresh doctors list
            const doctorsRes = await fetch('/api/doctors');
            const updatedDoctors = await doctorsRes.json();
            setDoctors(updatedDoctors);
          }
        }
      } catch (error) {
        console.error("Error updating doctor avatars:", error);
      }
    };

    updateAvatars();
  }, [doctors]);

  // Check for existing session
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setPatient(userData);
      setView('home');
    } else {
      setView('landing');
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setPatient(null);
    setView('landing');
  };

  const handleRegistration = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const age = formData.get('age') as string;
    const contact = formData.get('contact') as string;
    const gender = formData.get('gender') as 'Male' | 'Female' | 'Other';

    if (!name || !age || !contact) {
      setFeedback({ message: "Please fill all fields", type: 'error' });
      return;
    }

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, age, contact, gender })
      });
      const data = await res.json();
      setFeedback({ message: data.message, type: 'success' });
      
      const userData = { name, age, contact, gender };
      localStorage.setItem("user", JSON.stringify(userData));
      setPatient(userData);
      setView('home');
    } catch (error) {
      console.error("Registration error:", error);
      setFeedback({ message: "Registration failed", type: 'error' });
    }
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const contact = formData.get('contact') as string;

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, contact })
      });

      if (res.status === 200) {
        const data = await res.json();
        localStorage.setItem("user", JSON.stringify(data.user));
        setPatient(data.user);
        setFeedback({ message: "Login successful!", type: 'success' });
        setView('home');
      } else {
        setFeedback({ message: "Invalid login details", type: 'error' });
      }
    } catch (error) {
      console.error("Login error:", error);
      setFeedback({ message: "Login failed", type: 'error' });
    }
  };

  const specializations = ['All', 'Cardiologist', 'Dermatologist', 'Orthopedic', 'Neurologist', 'Pediatrician', 'General Physician', 'ENT Specialist', 'Dentist', 'Ophthalmologist', 'Gynecologist', 'Pulmonologist', 'Urologist', 'Gastroenterologist', 'Oncologist', 'Nephrologist', 'Endocrinologist'];
  const locations = ['All', 'Delhi', 'Mumbai', 'Ahmedabad', 'Pune', 'Hyderabad', 'Lucknow', 'Jaipur', 'Bhopal', 'Surat', 'Kochi', 'Indore', 'Nagpur', 'Chennai', 'Kolkata', 'Bengaluru'];

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('name', searchQuery);
      if (specialization !== 'All') params.append('specialization', specialization);
      if (location !== 'All') params.append('location', location);
      
      // Using the new /api/search endpoint as requested
      const response = await fetch(`/api/search?${params.toString()}`);
      const data = await response.json();
      setDoctors(data);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'listing' || view === 'home' || view === 'registration') {
      fetchDoctors();
    }
    if (view === 'appointments') {
      fetchAppointments();
    }
  }, [view, specialization, location, searchQuery]);

  const fetchAppointments = async () => {
    try {
      const response = await fetch('/api/appointments');
      const data = await response.json();
      setAppointments(data);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId || !patient) return;

    const doctor = doctors.find(d => d.id === selectedDoctorId);
    if (!doctor) return;

    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: doctor.id,
          doctorName: doctor.name,
          patientName: bookingData.patientName || patient.name,
          date: bookingData.date,
          time: bookingData.time
        })
      });

      if (response.ok) {
        setBookingSuccess(true);
        setTimeout(() => {
          setBookingSuccess(false);
          setShowBookingModal(false);
          setView('appointments');
        }, 2000);
      }
    } catch (error) {
      console.error('Error booking appointment:', error);
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    try {
      const response = await fetch(`/api/appointments/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setAppointments(prev => prev.filter(apt => apt.id !== id));
      }
    } catch (error) {
      console.error('Error deleting appointment:', error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setView('listing');
    fetchDoctors();
  };

  const selectedDoctor = doctors.find(d => d.id === selectedDoctorId);

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans text-slate-900 flex flex-col relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'radial-gradient(#10b981 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      </div>

      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div 
              className="flex items-center cursor-pointer" 
              onClick={() => { setView(patient ? 'home' : 'landing'); setSearchQuery(''); setSpecialization('All'); setLocation('All'); }}
            >
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                <Stethoscope size={24} />
              </div>
              <span className="ml-3 text-xl font-bold tracking-tight text-slate-900">DocSearch</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex space-x-8 text-sm font-medium text-slate-600">
              {patient ? (
                <>
                  <button onClick={() => setView('home')} className={`hover:text-emerald-600 transition-colors ${view === 'home' ? 'text-emerald-600' : ''}`}>Home</button>
                  <button onClick={() => setView('listing')} className={`hover:text-emerald-600 transition-colors ${view === 'listing' ? 'text-emerald-600' : ''}`}>Doctors</button>
                  <button onClick={() => setView('appointments')} className={`hover:text-emerald-600 transition-colors ${view === 'appointments' ? 'text-emerald-600' : ''}`}>Appointments</button>
                </>
              ) : (
                <>
                  <button onClick={() => setView('landing')} className={`hover:text-emerald-600 transition-colors ${view === 'landing' ? 'text-emerald-600' : ''}`}>Home</button>
                  <button onClick={() => setView('landing')} className="hover:text-emerald-600 transition-colors">Doctors</button>
                  <button onClick={() => setView('landing')} className="hover:text-emerald-600 transition-colors">About</button>
                  <button onClick={() => setView('landing')} className="hover:text-emerald-600 transition-colors">Contact</button>
                </>
              )}
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              {patient ? (
                <>
                  <div className="hidden sm:flex items-center text-slate-700 font-medium bg-slate-100 px-4 py-2 rounded-full border border-slate-200">
                    <User size={18} className="mr-2 text-emerald-600" />
                    <span id="username" className="max-w-[100px] truncate">{patient.name}</span>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="bg-slate-900 text-white px-4 sm:px-6 py-2 rounded-full text-sm font-bold hover:bg-slate-800 transition-all shadow-md active:scale-95 whitespace-nowrap"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => setView('signin')}
                    className="text-slate-600 hover:text-emerald-600 font-bold text-sm transition-colors"
                  >
                    Sign In
                  </button>
                  <button 
                    onClick={() => setView('registration')}
                    className="bg-emerald-600 text-white px-4 sm:px-6 py-2 rounded-full text-sm font-bold hover:bg-emerald-700 transition-all shadow-md active:scale-95 whitespace-nowrap"
                  >
                    Register
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Feedback Message */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50"
          >
            <div className={`px-6 py-3 rounded-full shadow-lg text-white font-bold flex items-center ${feedback.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
              {feedback.type === 'success' ? <Check size={18} className="mr-2" /> : <X size={18} className="mr-2" />}
              {feedback.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex-1 flex flex-col">
        {!patient ? (
          <AnimatePresence mode="wait">
            {view === 'landing' ? (
              <motion.div
                key="landing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col"
              >
                {/* Hero Section */}
                <div className="py-16 md:py-24 text-center">
                  <motion.h1 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-6"
                  >
                    Find the Right <span className="text-emerald-600">Doctor</span><br />
                    for Your Health
                  </motion.h1>
                  <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-12"
                  >
                    Book appointments with the best doctors in your area. 
                    Get expert medical advice and personalized care today.
                  </motion.p>

                  {/* Search Bar */}
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="max-w-4xl mx-auto bg-white p-2 rounded-2xl md:rounded-full shadow-xl border border-slate-100 flex flex-col md:flex-row items-center gap-2"
                  >
                    <div className="flex-1 w-full flex items-center px-4 py-3 md:py-0">
                      <Search className="text-emerald-500 mr-3" size={20} />
                      <input 
                        type="text" 
                        placeholder="Doctor name or keyword..."
                        className="w-full bg-transparent border-none focus:ring-0 text-slate-700 placeholder:text-slate-400"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    
                    <div className="h-8 w-[1px] bg-slate-200 hidden md:block"></div>

                    <div className="flex-1 w-full relative">
                      <button 
                        onClick={() => { setIsSpecOpen(!isSpecOpen); setIsLocationOpen(false); }}
                        className="w-full flex items-center justify-between px-4 py-3 md:py-4 text-slate-600 hover:bg-slate-50 transition-colors rounded-xl md:rounded-none"
                      >
                        <div className="flex items-center">
                          <Stethoscope className="text-emerald-500 mr-3" size={20} />
                          <span className="truncate">{specialization === 'All' ? 'Specialization' : specialization}</span>
                        </div>
                        <ChevronDown size={16} className={`transition-transform ${isSpecOpen ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {isSpecOpen && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute top-full left-0 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 max-h-60 overflow-y-auto"
                          >
                            {specializations.map(spec => (
                              <button
                                key={spec}
                                onClick={() => { setSpecialization(spec); setIsSpecOpen(false); }}
                                className="w-full text-left px-4 py-3 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-sm font-medium"
                              >
                                {spec}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="h-8 w-[1px] bg-slate-200 hidden md:block"></div>

                    <div className="flex-1 w-full relative">
                      <button 
                        onClick={() => { setIsLocationOpen(!isLocationOpen); setIsSpecOpen(false); }}
                        className="w-full flex items-center justify-between px-4 py-3 md:py-4 text-slate-600 hover:bg-slate-50 transition-colors rounded-xl md:rounded-none"
                      >
                        <div className="flex items-center">
                          <MapPin className="text-emerald-500 mr-3" size={20} />
                          <span className="truncate">{location === 'All' ? 'Location' : location}</span>
                        </div>
                        <ChevronDown size={16} className={`transition-transform ${isLocationOpen ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {isLocationOpen && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute top-full left-0 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 max-h-60 overflow-y-auto"
                          >
                            {locations.map(loc => (
                              <button
                                key={loc}
                                onClick={() => { setLocation(loc); setIsLocationOpen(false); }}
                                className="w-full text-left px-4 py-3 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-sm font-medium"
                              >
                                {loc}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <button 
                      onClick={() => setView('registration')}
                      className="w-full md:w-auto bg-emerald-600 text-white px-8 py-4 rounded-xl md:rounded-full font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-95 flex items-center justify-center"
                    >
                      <Search size={20} className="mr-2" />
                      Search
                    </button>
                  </motion.div>

                  {/* CTA Button */}
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mt-12"
                  >
                    <button 
                      onClick={() => setView('registration')}
                      className="group flex items-center mx-auto text-emerald-600 font-bold text-lg hover:text-emerald-700 transition-colors"
                    >
                      Register as Patient
                      <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </motion.div>
                </div>

                {/* Features Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-20">
                  {[
                    { icon: <Search className="text-emerald-600" />, title: "Easy Search", desc: "Find doctors by name, specialty, or location with ease." },
                    { icon: <Calendar className="text-emerald-600" />, title: "Instant Booking", desc: "Book your appointments instantly without any hassle." },
                    { icon: <Star className="text-emerald-600" />, title: "Top Rated", desc: "Connect with the most highly-rated medical professionals." }
                  ].map((feature, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + i * 0.1 }}
                      className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-6">
                        {feature.icon}
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                      <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : view === 'registration' ? (
              <motion.div
                key="registration"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex-1 flex flex-col items-center justify-center py-12"
              >
                <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl p-8 md:p-12 border border-slate-100">
                  <div className="text-center mb-10">
                    <div className="w-20 h-20 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 mx-auto mb-6">
                      <User size={40} />
                    </div>
                    <h2 className="text-4xl font-bold text-slate-900">Patient Registration</h2>
                    <p className="text-slate-500 mt-3 text-lg">Please provide your details to find the best doctors for you.</p>
                  </div>

                  <form 
                    className="space-y-8" 
                    onSubmit={handleRegistration}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
                        <input 
                          name="name"
                          type="text" 
                          required
                          placeholder="Enter your full name"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Age</label>
                        <input 
                          name="age"
                          type="number" 
                          required
                          placeholder="Enter your age"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Contact Number</label>
                      <input 
                        name="contact"
                        type="tel" 
                        required
                        placeholder="Enter your contact number"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-4">Gender</label>
                      <div className="flex flex-wrap gap-6">
                        {['Male', 'Female', 'Other'].map((g) => (
                          <label key={g} className="flex items-center cursor-pointer group">
                            <div className="relative flex items-center justify-center">
                              <input 
                                type="radio" 
                                name="gender" 
                                value={g} 
                                required
                                className="peer sr-only"
                              />
                              <div className="w-6 h-6 border-2 border-slate-300 rounded-full peer-checked:border-emerald-600 transition-all group-hover:border-emerald-400"></div>
                              <div className="absolute w-3 h-3 bg-emerald-600 rounded-full scale-0 peer-checked:scale-100 transition-transform"></div>
                            </div>
                            <span className="ml-3 text-slate-700 font-medium group-hover:text-emerald-600 transition-colors">{g}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <button 
                      type="submit"
                      className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 transform hover:-translate-y-1 active:translate-y-0"
                    >
                      Complete Registration
                    </button>
                  </form>

                  <div className="mt-8 text-center">
                    <p className="text-slate-500">
                      Already have an account? <button onClick={() => setView('signin')} className="text-emerald-600 font-bold hover:text-emerald-700">Login</button>
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="signin"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex-1 flex flex-col items-center justify-center py-12"
              >
                <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 border border-slate-100">
                  <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-200 mx-auto mb-4">
                      <User size={32} />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900">Welcome Back</h2>
                    <p className="text-slate-500 mt-2">Sign in to manage your appointments</p>
                  </div>

                  <form className="space-y-6" onSubmit={handleLogin}>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          name="name"
                          type="text" 
                          required
                          placeholder="Enter your name"
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Contact Number</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          name="contact"
                          type="tel" 
                          required
                          placeholder="Enter your contact"
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>

                    <button 
                      type="submit"
                      className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                    >
                      Sign In
                    </button>
                  </form>

                  <div className="mt-8 text-center">
                    <p className="text-slate-500 text-sm">
                      Don't have an account? <button onClick={() => setView('registration')} className="text-emerald-600 font-bold hover:text-emerald-700">Create Account</button>
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        ) : (
          <AnimatePresence mode="wait">
            {view === 'home' && (
              <motion.div
                key="home"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col"
              >
                {/* Hero Section */}
                <div className="py-16 md:py-24 text-center">
                  <motion.h1 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-6"
                  >
                    Find the Right <span className="text-emerald-600">Doctor</span><br />
                    for Your Health
                  </motion.h1>
                  <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-12"
                  >
                    Welcome back, <span className="font-bold text-slate-900">{patient.name}</span>! 
                    Search from thousands of certified medical professionals and book your next appointment.
                  </motion.p>

                  {/* Search Bar */}
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="max-w-4xl mx-auto bg-white p-2 rounded-2xl md:rounded-full shadow-xl border border-slate-100 flex flex-col md:flex-row items-center gap-2"
                  >
                    <div className="flex-1 w-full flex items-center px-4 py-3 md:py-0">
                      <Search className="text-emerald-500 mr-3" size={20} />
                      <input 
                        type="text" 
                        placeholder="Doctor name or keyword..."
                        className="w-full bg-transparent border-none focus:ring-0 text-slate-700 placeholder:text-slate-400"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    
                    <div className="h-8 w-[1px] bg-slate-200 hidden md:block"></div>

                    <div className="flex-1 w-full relative">
                      <button 
                        onClick={() => { setIsSpecOpen(!isSpecOpen); setIsLocationOpen(false); }}
                        className="w-full flex items-center justify-between px-4 py-3 md:py-4 text-slate-600 hover:bg-slate-50 transition-colors rounded-xl md:rounded-none"
                      >
                        <div className="flex items-center">
                          <Stethoscope className="text-emerald-500 mr-3" size={20} />
                          <span className="truncate">{specialization === 'All' ? 'Specialization' : specialization}</span>
                        </div>
                        <ChevronDown size={16} className={`transition-transform ${isSpecOpen ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {isSpecOpen && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute top-full left-0 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 max-h-60 overflow-y-auto"
                          >
                            {specializations.map(spec => (
                              <button
                                key={spec}
                                onClick={() => { setSpecialization(spec); setIsSpecOpen(false); }}
                                className="w-full text-left px-4 py-3 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-sm font-medium"
                              >
                                {spec}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="h-8 w-[1px] bg-slate-200 hidden md:block"></div>

                    <div className="flex-1 w-full relative">
                      <button 
                        onClick={() => { setIsLocationOpen(!isLocationOpen); setIsSpecOpen(false); }}
                        className="w-full flex items-center justify-between px-4 py-3 md:py-4 text-slate-600 hover:bg-slate-50 transition-colors rounded-xl md:rounded-none"
                      >
                        <div className="flex items-center">
                          <MapPin className="text-emerald-500 mr-3" size={20} />
                          <span className="truncate">{location === 'All' ? 'Location' : location}</span>
                        </div>
                        <ChevronDown size={16} className={`transition-transform ${isLocationOpen ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {isLocationOpen && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute top-full left-0 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 max-h-60 overflow-y-auto"
                          >
                            {locations.map(loc => (
                              <button
                                key={loc}
                                onClick={() => { setLocation(loc); setIsLocationOpen(false); }}
                                className="w-full text-left px-4 py-3 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-sm font-medium"
                              >
                                {loc}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <button 
                      onClick={() => setView('listing')}
                      className="w-full md:w-auto bg-emerald-600 text-white px-8 py-4 rounded-xl md:rounded-full font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-95 flex items-center justify-center"
                    >
                      <Search size={20} className="mr-2" />
                      Search
                    </button>
                  </motion.div>

                  {/* CTA Button */}
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mt-12"
                  >
                    <button 
                      onClick={() => setView('listing')}
                      className="group flex items-center mx-auto text-emerald-600 font-bold text-lg hover:text-emerald-700 transition-colors"
                    >
                      Find Doctors Now
                      <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </motion.div>
                </div>

                {/* Quick Stats or Features */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-20">
                  <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm text-center">
                    <div className="text-3xl font-bold text-emerald-600 mb-1">{doctors.length}+</div>
                    <div className="text-slate-500 font-medium">Certified Doctors</div>
                  </div>
                  <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm text-center">
                    <div className="text-3xl font-bold text-emerald-600 mb-1">{appointments.length}</div>
                    <div className="text-slate-500 font-medium">Your Appointments</div>
                  </div>
                  <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm text-center">
                    <div className="text-3xl font-bold text-emerald-600 mb-1">24/7</div>
                    <div className="text-slate-500 font-medium">Support Available</div>
                  </div>
                </div>
              </motion.div>
            )}

          {view === 'listing' && (
            <motion.div
              key="listing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900">Available Doctors</h2>
                  <p className="text-slate-500 mt-1">Showing {doctors.length} results for your search</p>
                </div>
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="flex items-center bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
                    <Search size={18} className="text-slate-400 mr-2" />
                    <input 
                      id="searchInput"
                      type="text"
                      placeholder="Search doctor..."
                      className="focus:outline-none text-sm font-medium text-slate-700 bg-transparent w-40"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="relative">
                    <div 
                      onClick={() => setIsSpecOpen(!isSpecOpen)}
                      className="flex items-center bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm cursor-pointer hover:border-emerald-500 transition-colors min-w-[180px]"
                    >
                      <Filter size={18} className="text-slate-400 mr-2" />
                      <span className="text-sm font-medium text-slate-700 flex-1">
                        {specialization === 'All' ? 'All Specializations' : specialization}
                      </span>
                      <ChevronDown size={16} className={`text-slate-400 transition-transform ${isSpecOpen ? 'rotate-180' : ''}`} />
                    </div>
                    
                    {isSpecOpen && (
                      <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-2xl z-50 py-2 max-h-60 overflow-y-auto">
                        {specializations.map(spec => (
                          <button
                            key={spec}
                            type="button"
                            onClick={() => { setSpecialization(spec); setIsSpecOpen(false); }}
                            className={`w-full px-4 py-2 text-left hover:bg-emerald-50 text-sm transition-colors ${specialization === spec ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-700 font-medium'}`}
                          >
                            {spec === 'All' ? 'All Specializations' : spec}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <div 
                      onClick={() => setIsLocationOpen(!isLocationOpen)}
                      className="flex items-center bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm cursor-pointer hover:border-emerald-500 transition-colors min-w-[160px]"
                    >
                      <MapPin size={18} className="text-slate-400 mr-2" />
                      <span className="text-sm font-medium text-slate-700 flex-1">
                        {location === 'All' ? 'All Locations' : location}
                      </span>
                      <ChevronDown size={16} className={`text-slate-400 transition-transform ${isLocationOpen ? 'rotate-180' : ''}`} />
                    </div>
                    
                    {isLocationOpen && (
                      <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-2xl z-50 py-2 max-h-60 overflow-y-auto">
                        {locations.map(loc => (
                          <button
                            key={loc}
                            type="button"
                            onClick={() => { setLocation(loc); setIsLocationOpen(false); }}
                            className={`w-full px-4 py-2 text-left hover:bg-emerald-50 text-sm transition-colors ${location === loc ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-700 font-medium'}`}
                          >
                            {loc === 'All' ? 'All Locations' : loc}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => fetchDoctors()}
                    className="bg-emerald-600 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-md"
                  >
                    Search
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mb-4">
                <h3 id="resultCount" className="text-lg font-bold text-slate-700">
                  {doctors.length} {doctors.length === 1 ? 'doctor' : 'doctors'} found
                </h3>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 animate-pulse">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-slate-100 rounded-xl"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                          <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                        </div>
                      </div>
                      <div className="mt-6 space-y-2">
                        <div className="h-3 bg-slate-100 rounded w-full"></div>
                        <div className="h-3 bg-slate-100 rounded w-full"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {doctors.length > 0 ? (
                    doctors.map((doctor) => (
                      <motion.div
                        layoutId={`doctor-${doctor.id}`}
                        key={doctor.id}
                        className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-2xl hover:border-emerald-200 transition-all group relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-12 -mt-12 group-hover:bg-emerald-100 transition-colors"></div>
                        
                        <div className="flex items-start justify-between relative z-10">
                          <div className="relative">
                            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-teal-400 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                            <img 
                              src={doctor.image} 
                              alt={doctor.name} 
                              className="relative w-20 h-20 rounded-full object-cover shadow-md border-2 border-white transform group-hover:scale-105 transition-transform duration-300"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute -bottom-2 -right-2 bg-white p-1 rounded-full shadow-lg border border-slate-100">
                              <div className="bg-emerald-500 text-white p-1 rounded-full">
                                <Star size={10} className="fill-white" />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg text-xs font-bold">
                            {doctor.rating}
                          </div>
                        </div>
                        <div className="mt-6 relative z-10">
                          <h3 className="text-xl font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">{doctor.name}</h3>
                          <div className="flex items-center mt-1">
                            <span className={`w-2 h-2 rounded-full mr-2 ${doctor.gender === 'Male' ? 'bg-blue-400' : 'bg-pink-400'}`}></span>
                            <p className="text-emerald-600 font-medium text-sm">{doctor.specialization}</p>
                          </div>
                          
                          <div className="mt-4 space-y-2">
                            <div className="flex items-center text-slate-500 text-sm">
                              <Building size={16} className="mr-2 text-slate-400" />
                              {doctor.hospital || 'City General Hospital'}
                            </div>
                            <div className="flex items-center text-slate-500 text-sm">
                              <MapPin size={16} className="mr-2 text-slate-400" />
                              {doctor.location}
                            </div>
                            <div className="flex items-center text-slate-500 text-sm">
                              <IndianRupee size={16} className="mr-2 text-slate-400" />
                              Fees: ₹{doctor.fees || 500}
                            </div>
                          </div>

                          <button 
                            onClick={() => { setSelectedDoctorId(doctor.id); setView('profile'); }}
                            className="w-full mt-6 bg-slate-900 text-white py-3 rounded-xl font-semibold hover:bg-emerald-600 transition-all shadow-lg hover:shadow-emerald-200"
                          >
                            View Profile
                          </button>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="col-span-full py-20 text-center">
                      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                        <Search size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900">No doctors found</h3>
                      <p className="text-slate-500 mt-2">Try adjusting your search or filters to find what you're looking for.</p>
                      <button 
                        onClick={() => { setSearchQuery(''); setSpecialization('All'); setLocation('All'); }}
                        className="mt-6 text-emerald-600 font-bold hover:text-emerald-700"
                      >
                        Clear all filters
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Thank You Section */}
              <section className="bg-emerald-600 py-16 mt-20 -mx-4 sm:-mx-6 lg:-mx-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="text-white"
                  >
                    <h2 className="text-4xl md:text-5xl font-bold mb-6 italic">Thank you for visiting!</h2>
                    <p className="text-emerald-100 text-xl max-w-2xl mx-auto">
                      We hope you found the right healthcare professional for your needs. Your health is our priority.
                    </p>
                  </motion.div>
                </div>
              </section>
            </motion.div>
          )}

            {view === 'appointments' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="max-w-4xl mx-auto"
              >
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-3xl font-bold text-slate-900">My Appointments</h2>
                  <button 
                    onClick={() => setView('listing')}
                    className="text-emerald-600 font-bold flex items-center hover:underline"
                  >
                    Book New <ArrowRight size={18} className="ml-1" />
                  </button>
                </div>

                <div className="space-y-4">
                  {appointments.length > 0 ? (
                    appointments.map((apt) => (
                      <div key={apt.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 mr-4">
                            <Calendar size={24} />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900">{apt.doctorName}</h4>
                            <p className="text-slate-500 text-sm">{apt.patientName} • {apt.date} at {apt.time}</p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold mr-4">
                            {apt.status}
                          </span>
                          <button 
                            onClick={() => handleDeleteAppointment(apt.id)}
                            className="text-slate-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg"
                            title="Cancel Appointment"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                      <Calendar size={48} className="mx-auto text-slate-300 mb-4" />
                      <h3 className="text-xl font-bold text-slate-900">No appointments yet</h3>
                      <p className="text-slate-500 mt-2">Your scheduled visits will appear here.</p>
                      <button 
                        onClick={() => setView('listing')}
                        className="mt-6 bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-100"
                      >
                        Find a Doctor
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

          {view === 'profile' && selectedDoctor && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl mx-auto"
            >
              <button 
                onClick={() => setView('listing')}
                className="flex items-center text-slate-500 hover:text-emerald-600 transition-colors mb-8 font-medium"
              >
                <ChevronLeft size={20} className="mr-1" />
                Back to search
              </button>

              <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
                <div className="bg-emerald-600 h-32 md:h-48"></div>
                <div className="px-6 md:px-12 pb-12 -mt-16 md:-mt-24">
                  <div className="flex flex-col md:flex-row md:items-end gap-6">
                    <div className="relative">
                      <div className="absolute -inset-2 bg-gradient-to-r from-emerald-600 to-teal-400 rounded-[2rem] blur opacity-30"></div>
                      <img 
                        src={selectedDoctor.image} 
                        alt={selectedDoctor.name} 
                        className="relative w-32 h-32 md:w-48 md:h-48 rounded-full object-cover border-4 border-white shadow-2xl transform hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute bottom-2 right-2 bg-emerald-500 text-white p-2 rounded-full shadow-xl border-2 border-white">
                        <Star size={20} className="fill-white" />
                      </div>
                    </div>
                    <div className="flex-1 mb-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900">{selectedDoctor.name}</h2>
                        <div className="flex items-center bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-sm font-bold">
                          <Star size={14} className="fill-emerald-700 mr-1" />
                          {selectedDoctor.rating} Rating
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${selectedDoctor.gender === 'Male' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                          {selectedDoctor.gender}
                        </span>
                      </div>
                      <p className="text-emerald-600 text-lg font-semibold mt-2">{selectedDoctor.specialization}</p>
                    </div>
                    <button 
                      onClick={() => setShowBookingModal(true)}
                      className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 mb-4 transform hover:-translate-y-1"
                    >
                      Book Appointment
                    </button>
                  </div>

                      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-12">
                        <div className="md:col-span-2 space-y-8">
                          <section>
                            <h3 className="text-xl font-bold text-slate-900 flex items-center mb-4">
                              <Info size={20} className="mr-2 text-emerald-600" />
                              About Doctor
                            </h3>
                            <p className="text-slate-600 leading-relaxed text-lg">
                              {selectedDoctor.about}
                            </p>
                          </section>

                          <section>
                            <h3 className="text-xl font-bold text-slate-900 flex items-center mb-4">
                              <Building size={20} className="mr-2 text-emerald-600" />
                              Practice Details
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                              <div className="bg-slate-50 p-4 rounded-2xl">
                                <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Hospital</div>
                                <div className="text-slate-900 font-bold mt-1">{selectedDoctor.hospital || 'City General Hospital'}</div>
                              </div>
                              <div className="bg-slate-50 p-4 rounded-2xl">
                                <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Consultation Fee</div>
                                <div className="text-slate-900 font-bold mt-1">₹{selectedDoctor.fees || 500}</div>
                              </div>
                            </div>
                          </section>

                          <section>
                            <h3 className="text-xl font-bold text-slate-900 flex items-center mb-4">
                              <User size={20} className="mr-2 text-emerald-600" />
                              Professional Details
                            </h3>
                            <div className="grid grid-cols-2 gap-6">
                              <div className="bg-slate-50 p-4 rounded-2xl">
                                <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Experience</div>
                                <div className="text-slate-900 font-bold mt-1">{selectedDoctor.experience}</div>
                              </div>
                              <div className="bg-slate-50 p-4 rounded-2xl">
                                <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Specialization</div>
                                <div className="text-slate-900 font-bold mt-1">{selectedDoctor.specialization}</div>
                              </div>
                            </div>
                          </section>
                        </div>

                    <div className="space-y-6">
                      <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl">
                        <h3 className="text-xl font-bold mb-6">Contact Info</h3>
                        <div className="space-y-6">
                          <div className="flex items-start">
                            <MapPin size={20} className="mr-4 text-emerald-400 shrink-0" />
                            <div>
                              <div className="text-sm text-slate-400 font-medium">Location</div>
                              <div className="font-semibold">{selectedDoctor.location}</div>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <Phone size={20} className="mr-4 text-emerald-400 shrink-0" />
                            <div>
                              <div className="text-sm text-slate-400 font-medium">Phone</div>
                              <div className="font-semibold">{selectedDoctor.contact}</div>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <Clock size={20} className="mr-4 text-emerald-400 shrink-0" />
                            <div>
                              <div className="text-sm text-slate-400 font-medium">Availability</div>
                              <div className="font-semibold">{selectedDoctor.availability}</div>
                            </div>
                          </div>
                        </div>
                        <button className="w-full mt-8 border border-white/20 hover:bg-white/10 py-3 rounded-xl transition-all font-semibold flex items-center justify-center">
                          <Mail size={18} className="mr-2" />
                          Send Message
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </main>

      {patient && (
        <>
          <footer className="bg-white border-t border-slate-200 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                <div className="col-span-1 md:col-span-2">
                  <div className="flex items-center mb-6">
                    <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white">
                      <Stethoscope size={18} />
                    </div>
                    <span className="ml-2 text-xl font-bold tracking-tight text-slate-900">DocSearch</span>
                  </div>
                  <p className="text-slate-500 max-w-sm leading-relaxed">
                    Making healthcare accessible and easy for everyone. Find and book the best doctors in your area with just a few clicks.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-6">Quick Links</h4>
                  <ul className="space-y-4 text-slate-500">
                    <li><button onClick={() => setView('home')} className="hover:text-emerald-600 transition-colors">Home</button></li>
                    <li><button onClick={() => setView('listing')} className="hover:text-emerald-600 transition-colors">Find Doctors</button></li>
                    <li><button className="hover:text-emerald-600 transition-colors">About Us</button></li>
                    <li><button className="hover:text-emerald-600 transition-colors">Contact</button></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-6">Legal</h4>
                  <ul className="space-y-4 text-slate-500">
                    <li><button className="hover:text-emerald-600 transition-colors">Privacy Policy</button></li>
                    <li><button className="hover:text-emerald-600 transition-colors">Terms of Service</button></li>
                    <li><button className="hover:text-emerald-600 transition-colors">Cookie Policy</button></li>
                  </ul>
                </div>
              </div>
              <div className="border-t border-slate-100 mt-12 pt-8 text-center text-slate-400 text-sm">
                © 2026 DocSearch. All rights reserved.
              </div>
            </div>
          </footer>

          {/* Booking Modal */}
          <AnimatePresence>
            {showBookingModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowBookingModal(false)}
                  className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
                >
                  {bookingSuccess ? (
                    <div className="p-12 text-center">
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6"
                      >
                        <Check size={40} />
                      </motion.div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-2">Booking Confirmed!</h3>
                      <p className="text-slate-500">Your appointment has been successfully scheduled.</p>
                    </div>
                  ) : (
                    <div className="p-8">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-2xl font-bold text-slate-900">Schedule Visit</h3>
                        <button onClick={() => setShowBookingModal(false)} className="text-slate-400 hover:text-slate-600">
                          <X size={24} />
                        </button>
                      </div>

                      <form onSubmit={handleBooking} className="space-y-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Patient Name</label>
                          <input 
                            type="text" 
                            required
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                            placeholder="Full Name"
                            value={bookingData.patientName}
                            onChange={(e) => setBookingData({...bookingData, patientName: e.target.value})}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Date</label>
                            <input 
                              type="date" 
                              required
                              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                              value={bookingData.date}
                              onChange={(e) => setBookingData({...bookingData, date: e.target.value})}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Time</label>
                            <select 
                              required
                              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                              value={bookingData.time}
                              onChange={(e) => setBookingData({...bookingData, time: e.target.value})}
                            >
                              <option value="">Select Time</option>
                              <option value="09:00 AM">09:00 AM</option>
                              <option value="10:00 AM">10:00 AM</option>
                              <option value="11:00 AM">11:00 AM</option>
                              <option value="02:00 PM">02:00 PM</option>
                              <option value="03:00 PM">03:00 PM</option>
                              <option value="04:00 PM">04:00 PM</option>
                            </select>
                          </div>
                        </div>
                        <button 
                          type="submit"
                          className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 mt-4"
                        >
                          Confirm Booking
                        </button>
                      </form>
                    </div>
                  )}
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
