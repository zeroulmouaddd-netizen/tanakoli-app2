import { initializeApp } from "firebase/app"
import { getFirestore, collection, doc, setDoc } from "firebase/firestore"

const firebaseConfig = {
  apiKey: 'AIzaSyCz62DFbbD89fpYUXdg38nRCohX-yTJ4z8',
  authDomain: 'tanakoli-khenchela.firebaseapp.com',
  projectId: 'tanakoli-khenchela',
  storageBucket: 'tanakoli-khenchela.firebasestorage.app',
  messagingSenderId: '757217321198',
  appId: '1:757217321198:web:1cbdfd808a180b6ff9d3ff'
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// Bus routes data for Khenchela
const routes = [
  {
    id: "route-01",
    name: "خط الجامعة",
    nameEn: "University Line",
    lineNumber: "01",
    color: "#00A651",
    price: 30,
    workingHours: {
      start: "06:00",
      end: "20:00"
    },
    frequency: 15, // minutes between buses
    stops: [
      { id: "s1", name: "الجامعة", nameEn: "University", coords: [35.4420, 7.1380], order: 1 },
      { id: "s2", name: "حي 500 مسكن", nameEn: "500 Housing", coords: [35.4400, 7.1420], order: 2 },
      { id: "s3", name: "وسط المدينة", nameEn: "City Center", coords: [35.4377, 7.1458], order: 3 },
      { id: "s4", name: "السوق المركزي", nameEn: "Central Market", coords: [35.4400, 7.1550], order: 4 },
      { id: "s5", name: "المستشفى", nameEn: "Hospital", coords: [35.4330, 7.1520], order: 5 },
      { id: "s6", name: "محطة القطار", nameEn: "Train Station", coords: [35.4350, 7.1350], order: 6 },
    ]
  },
  {
    id: "route-02",
    name: "خط عين البيضاء",
    nameEn: "Ain El Beyda Line",
    lineNumber: "02",
    color: "#FF6B00",
    price: 40,
    workingHours: {
      start: "05:30",
      end: "21:00"
    },
    frequency: 20,
    stops: [
      { id: "s7", name: "محطة القطار", nameEn: "Train Station", coords: [35.4350, 7.1350], order: 1 },
      { id: "s8", name: "طريق عين البيضاء", nameEn: "Ain El Beyda Road", coords: [35.4450, 7.1320], order: 2 },
      { id: "s9", name: "وسط المدينة", nameEn: "City Center", coords: [35.4377, 7.1458], order: 3 },
      { id: "s10", name: "المستشفى", nameEn: "Hospital", coords: [35.4330, 7.1520], order: 4 },
      { id: "s11", name: "ملعب أول نوفمبر", nameEn: "November 1st Stadium", coords: [35.4400, 7.1480], order: 5 },
    ]
  },
  {
    id: "route-03",
    name: "خط المدينة الجديدة",
    nameEn: "New City Line",
    lineNumber: "03",
    color: "#3B82F6",
    price: 30,
    workingHours: {
      start: "06:30",
      end: "19:30"
    },
    frequency: 25,
    stops: [
      { id: "s12", name: "المدينة الجديدة", nameEn: "New City", coords: [35.4290, 7.1400], order: 1 },
      { id: "s13", name: "حي الأمل", nameEn: "El Amel District", coords: [35.4310, 7.1430], order: 2 },
      { id: "s14", name: "وسط المدينة", nameEn: "City Center", coords: [35.4377, 7.1458], order: 3 },
      { id: "s15", name: "السوق المركزي", nameEn: "Central Market", coords: [35.4400, 7.1550], order: 4 },
      { id: "s16", name: "ملعب أول نوفمبر", nameEn: "November 1st Stadium", coords: [35.4400, 7.1480], order: 5 },
      { id: "s17", name: "محطة القطار", nameEn: "Train Station", coords: [35.4350, 7.1350], order: 6 },
    ]
  },
  {
    id: "route-04",
    name: "خط بوحمامة",
    nameEn: "Bouhmama Line",
    lineNumber: "04",
    color: "#8B5CF6",
    price: 50,
    workingHours: {
      start: "06:00",
      end: "18:00"
    },
    frequency: 30,
    stops: [
      { id: "s18", name: "محطة القطار", nameEn: "Train Station", coords: [35.4350, 7.1350], order: 1 },
      { id: "s19", name: "وسط المدينة", nameEn: "City Center", coords: [35.4377, 7.1458], order: 2 },
      { id: "s20", name: "مفترق بوحمامة", nameEn: "Bouhmama Junction", coords: [35.4500, 7.1600], order: 3 },
      { id: "s21", name: "بوحمامة", nameEn: "Bouhmama", coords: [35.4650, 7.1750], order: 4 },
    ]
  },
  {
    id: "route-05",
    name: "خط شيلية",
    nameEn: "Chechar Line",
    lineNumber: "05",
    color: "#EC4899",
    price: 60,
    workingHours: {
      start: "07:00",
      end: "17:00"
    },
    frequency: 45,
    stops: [
      { id: "s22", name: "محطة القطار", nameEn: "Train Station", coords: [35.4350, 7.1350], order: 1 },
      { id: "s23", name: "طريق شيلية", nameEn: "Chechar Road", coords: [35.4200, 7.1200], order: 2 },
      { id: "s24", name: "قرية شيلية", nameEn: "Chechar Village", coords: [35.3900, 7.0900], order: 3 },
    ]
  }
]

// Station data with detailed information
const stations = [
  {
    id: "station-university",
    name: "الجامعة",
    nameEn: "University",
    address: "جامعة عباس لغرور - خنشلة",
    coords: [35.4420, 7.1380],
    lines: ["01"],
    facilities: ["wifi", "shelter", "bench"],
    isMainStation: true
  },
  {
    id: "station-city-center",
    name: "وسط المدينة",
    nameEn: "City Center",
    address: "شارع أول نوفمبر - وسط المدينة",
    coords: [35.4377, 7.1458],
    lines: ["01", "02", "03", "04"],
    facilities: ["shelter", "bench", "kiosk"],
    isMainStation: true
  },
  {
    id: "station-train",
    name: "محطة القطار",
    nameEn: "Train Station",
    address: "المحطة البرية والسككية",
    coords: [35.4350, 7.1350],
    lines: ["01", "02", "03", "04", "05"],
    facilities: ["wifi", "shelter", "bench", "toilet", "kiosk"],
    isMainStation: true
  },
  {
    id: "station-hospital",
    name: "المستشفى",
    nameEn: "Hospital",
    address: "المستشفى العمومي - خنشلة",
    coords: [35.4330, 7.1520],
    lines: ["01", "02"],
    facilities: ["shelter", "bench"],
    isMainStation: true
  },
  {
    id: "station-market",
    name: "السوق المركزي",
    nameEn: "Central Market",
    address: "السوق المركزي - خنشلة",
    coords: [35.4400, 7.1550],
    lines: ["01", "03"],
    facilities: ["shelter", "kiosk"],
    isMainStation: true
  },
  {
    id: "station-stadium",
    name: "ملعب أول نوفمبر",
    nameEn: "November 1st Stadium",
    address: "الملعب البلدي - خنشلة",
    coords: [35.4400, 7.1480],
    lines: ["02", "03"],
    facilities: ["bench"],
    isMainStation: false
  },
  {
    id: "station-ain-beyda",
    name: "طريق عين البيضاء",
    nameEn: "Ain El Beyda Road",
    address: "الطريق الوطني - اتجاه عين البيضاء",
    coords: [35.4450, 7.1320],
    lines: ["02"],
    facilities: ["shelter"],
    isMainStation: false
  },
  {
    id: "station-new-city",
    name: "المدينة الجديدة",
    nameEn: "New City",
    address: "حي 500 مسكن - المدينة الجديدة",
    coords: [35.4290, 7.1400],
    lines: ["03"],
    facilities: ["shelter", "bench"],
    isMainStation: false
  }
]

async function seedData() {
  console.log("Starting to seed routes and stations...")
  
  // Seed routes
  const routesCollection = collection(db, "routes")
  for (const route of routes) {
    await setDoc(doc(routesCollection, route.id), route)
    console.log(`Added route: ${route.name}`)
  }
  
  // Seed stations
  const stationsCollection = collection(db, "stations")
  for (const station of stations) {
    await setDoc(doc(stationsCollection, station.id), station)
    console.log(`Added station: ${station.name}`)
  }
  
  console.log("Seeding complete!")
  process.exit(0)
}

seedData().catch((error) => {
  console.error("Error seeding data:", error)
  process.exit(1)
})
