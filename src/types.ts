export interface Doctor {
  id: string;
  name: string;
  specialization: string;
  location: string;
  experience: string;
  rating: number;
  contact: string;
  availability: string;
  image: string;
  about: string;
  gender: 'Male' | 'Female';
  hospital: string;
  fees: number;
}

export interface Appointment {
  id: string;
  doctorId: string;
  doctorName: string;
  patientName: string;
  date: string;
  time: string;
  status: 'Pending' | 'Confirmed' | 'Cancelled';
  createdAt: string;
}

export interface Patient {
  name: string;
  age: string;
  contact: string;
  gender: 'Male' | 'Female' | 'Other';
}

export type View = 'landing' | 'registration' | 'home' | 'listing' | 'profile' | 'signin' | 'appointments';
