#!/usr/bin/env node

/**
 * Test script to simulate driver location updates to Firebase Realtime Database
 * This simulates a driver (phone: 0775453629) moving on a route
 * 
 * Usage: node scripts/test-driver-location.js
 */

const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set } = require('firebase/database');

const firebaseConfig = {
  apiKey: "AIzaSyCz62DFbbD89fpYUXdg38nRCohX-yTJ4z8",
  authDomain: "tanakoli-khenchela.firebaseapp.com",
  projectId: "tanakoli-khenchela",
  storageBucket: "tanakoli-khenchela.firebasestorage.app",
  messagingSenderId: "757217321198",
  appId: "1:757217321198:web:1cbdfd808a180b6ff9d3ff",
  measurementId: "G-S4BJ4GEEKF",
  databaseURL: "https://tanakoli-khenchela-default-rtdb.firebaseio.com",
};

const app = initializeApp(firebaseConfig);
const rtdb = getDatabase(app);

// Simulate driver moving along route 01 in Khenchela
const routeWaypoints = [
  { lat: 35.4420, lng: 7.1380 }, // University
  { lat: 35.4400, lng: 7.1420 },
  { lat: 35.4377, lng: 7.1458 }, // City Center
  { lat: 35.4400, lng: 7.1550 },
  { lat: 35.4330, lng: 7.1520 }, // Hospital
  { lat: 35.4350, lng: 7.1350 }, // Bus Station
];

let currentWaypoint = 0;

async function updateDriverLocation() {
  const waypoint = routeWaypoints[currentWaypoint];
  
  // Add small random variations to simulate smooth movement
  const lat = waypoint.lat + (Math.random() - 0.5) * 0.0005;
  const lng = waypoint.lng + (Math.random() - 0.5) * 0.0005;

  const locationRef = ref(rtdb, 'drivers/0775453629/location');
  
  try {
    await set(locationRef, { lat, lng });
    console.log(`✓ Driver location updated: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
  } catch (error) {
    console.error('✗ Failed to update location:', error.message);
  }

  currentWaypoint = (currentWaypoint + 1) % routeWaypoints.length;
}

// Start sending location updates every 5 seconds
console.log('🚌 Starting driver location simulation...');
console.log('📍 Driver phone: 0775453629');
console.log('🗺️ Route: Urban Line 01 (Khenchela)');
console.log('⏱️ Update interval: 5 seconds\n');

const interval = setInterval(updateDriverLocation, 5000);

// Update immediately on start
updateDriverLocation();

// Keep running until interrupted
process.on('SIGINT', () => {
  clearInterval(interval);
  console.log('\n🛑 Driver location simulation stopped');
  process.exit(0);
});
