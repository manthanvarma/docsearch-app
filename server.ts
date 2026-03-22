import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(process.cwd(), "db.json");

const getDb = () => {
  if (!fs.existsSync(DB_PATH)) {
    return { users: [], doctors: [] };
  }
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
};

const saveDb = (data: any) => {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API Routes
  app.get("/api/doctors", (req, res) => {
    const { search, specialization, location } = req.query;
    const db = getDb();
    let filteredDoctors = [...db.doctors];

    if (search) {
      const searchStr = (search as string).toLowerCase().trim();
      const searchTerms = searchStr.split(/\s+/);
      
      filteredDoctors = filteredDoctors.filter((d: any) => {
        const name = d.name.toLowerCase();
        const spec = d.specialization.toLowerCase();
        const combined = `${name} ${spec}`;
        
        // Check if all search terms are present in either name or specialization
        return searchTerms.every(term => combined.includes(term));
      });
    }

    if (specialization && specialization !== "All") {
      filteredDoctors = filteredDoctors.filter((d: any) => d.specialization === specialization);
    }

    if (location && location !== "All") {
      filteredDoctors = filteredDoctors.filter((d: any) => d.location.toLowerCase().includes((location as string).toLowerCase()));
    }

    res.json(filteredDoctors);
  });

  // Filter + Search API (Alias for /api/doctors to match user request)
  app.get("/api/search", (req, res) => {
    const { name, specialization, location } = req.query;
    const db = getDb();
    let filteredDoctors = [...db.doctors];

    if (name) {
      const searchStr = (name as string).toLowerCase().trim();
      const searchTerms = searchStr.split(/\s+/);
      
      filteredDoctors = filteredDoctors.filter((d: any) => {
        const docName = d.name.toLowerCase();
        const spec = d.specialization.toLowerCase();
        const combined = `${docName} ${spec}`;
        return searchTerms.every(term => combined.includes(term));
      });
    }

    if (specialization && specialization !== "" && specialization !== "All") {
      filteredDoctors = filteredDoctors.filter((d: any) => d.specialization === specialization);
    }

    if (location && location !== "" && location !== "All") {
      filteredDoctors = filteredDoctors.filter((d: any) => d.location.toLowerCase().includes((location as string).toLowerCase()));
    }

    res.json(filteredDoctors);
  });

  app.get("/api/doctors/:id", (req, res) => {
    const db = getDb();
    const doctor = db.doctors.find((d: any) => d.id === req.params.id);
    if (doctor) {
      res.json(doctor);
    } else {
      res.status(404).json({ message: "Doctor not found" });
    }
  });

  // Appointment Endpoints
  app.post("/api/appointments", (req, res) => {
    const appointment = req.body;
    const db = getDb();
    
    if (!db.appointments) db.appointments = [];
    
    const newAppointment = {
      ...appointment,
      id: Date.now().toString(),
      status: 'Confirmed',
      createdAt: new Date().toISOString()
    };
    
    db.appointments.push(newAppointment);
    saveDb(db);
    
    res.status(201).json(newAppointment);
  });

  app.get("/api/appointments", (req, res) => {
    const db = getDb();
    res.json(db.appointments || []);
  });

  app.delete("/api/appointments/:id", (req, res) => {
    const { id } = req.params;
    const db = getDb();
    
    if (!db.appointments) {
      return res.status(404).json({ message: "No appointments found" });
    }
    
    const initialLength = db.appointments.length;
    db.appointments = db.appointments.filter((apt: any) => apt.id !== id);
    
    if (db.appointments.length === initialLength) {
      return res.status(404).json({ message: "Appointment not found" });
    }
    
    saveDb(db);
    res.json({ message: "Appointment deleted successfully" });
  });

  // User Registration
  app.post("/api/register", (req, res) => {
    const db = getDb();
    const newUser = { ...req.body, id: Date.now() };
    db.users.push(newUser);
    saveDb(db);
    res.json({ message: "User Registered Successfully", user: newUser });
  });

  // User Login
  app.post("/api/login", (req, res) => {
    const { name, contact } = req.body;
    const db = getDb();
    const user = db.users.find((u: any) => u.name === name && u.contact === contact);

    if (user) {
      res.json({ message: "Login Success", user });
    } else {
      res.status(401).json({ message: "Invalid details" });
    }
  });

  app.post("/api/update-doctor-images", (req, res) => {
    const { maleImage, femaleImage } = req.body;
    const db = getDb();
    db.doctors = db.doctors.map((doc: any) => {
      if (doc.gender === "Male") {
        doc.image = maleImage;
      } else if (doc.gender === "Female") {
        doc.image = femaleImage;
      }
      return doc;
    });
    saveDb(db);
    res.json({ message: "Doctor images updated successfully" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
