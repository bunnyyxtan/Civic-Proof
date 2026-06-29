// src/lib/demo/civicDemoPayloads.ts
// Realistic test payloads verifying our core engine loops

import { ReportIntake } from "../civic/types";

export const INTAKE_SCHOOL_DRAIN: ReportIntake = {
  imageDataUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
  locationName: "Indiranagar 100ft Road, opposite Government Primary School",
  latitude: 12.9716,
  longitude: 77.5946,
  citizenNote: "Extremely severe open drain right next to the school entrance. Standing water and mosquitoes everywhere. Kids have to walk around this. Extremely risky!",
  selectedCategory: "water_leakage",
  reportedAt: "2026-06-29T08:00:00Z",
};

export const INTAKE_SCHOOL_DRAIN_DUPLICATE: ReportIntake = {
  imageDataUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
  locationName: "Indiranagar 100ft Road, Government School boundary",
  latitude: 12.9718, // 20 meters away
  longitude: 77.5948,
  citizenNote: "Stagnant black water in an open culvert beside the school gate. Highly dangerous and smelling horribly. Mosquitoes breed here.",
  selectedCategory: "water_leakage",
  reportedAt: "2026-06-29T08:15:00Z",
};

export const INTAKE_ROAD_CRATER: ReportIntake = {
  imageDataUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
  locationName: "CMH Road, Metro Station Pillar 125",
  latitude: 12.9789,
  longitude: 77.6412,
  citizenNote: "Huge deep pothole crater in the middle of the road. Scooters are swerving to avoid it. High crash hazard especially during nighttime rain flooding.",
  selectedCategory: "road_damage",
  reportedAt: "2026-06-29T09:30:00Z",
};
