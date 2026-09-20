// AapdaDrishti - Clean Data Store
// Realistic Disaster Cases with Muted Urgency Mappings

window.AAPDA_DATA = {
  scenarios: {
    flood: {
      id: "flood",
      name: "Flood",
      description: "Aerial footage of flooded residential and riverine sectors.",
      cases: [
        {
          id: "CASE-01",
          scenario: "flood",
          priority: "CRITICAL",
          title: "Submerged Vehicle Roof",
          coordinates: "28.6982° N, 77.2341° E",
          accuracy: "≈14m accuracy",
          verified: false,
          confidence: "96%",
          summary: "Individual stranded on top of a partially submerged van in moving water.",
          detailNotes: "Drone camera identified a person signaling from the roof of a commercial vehicle. Water level is close to the window line with visible current.",
          lat: 28.6982,
          lng: 77.2341
        },
        {
          id: "CASE-02",
          scenario: "flood",
          priority: "HIGH",
          title: "Isolated Second-Floor Terrace",
          coordinates: "28.7060° N, 77.2395° E",
          accuracy: "≈16m accuracy",
          verified: true,
          confidence: "93%",
          summary: "Three individuals waiting on a dry terrace above the current floodline.",
          detailNotes: "Group located on an elevated terrace. Ground floor is inundated but the structure is stable.",
          lat: 28.7060,
          lng: 77.2395
        }
      ]
    },
    fire: {
      id: "fire",
      name: "Fire",
      description: "Thermal and optical aerial footage of industrial perimeter fires.",
      cases: [
        {
          id: "CASE-03",
          scenario: "fire",
          priority: "CRITICAL",
          title: "Warehouse Roof Parapet",
          coordinates: "28.6874° N, 77.2412° E",
          accuracy: "≈10m accuracy",
          verified: false,
          confidence: "97%",
          summary: "Worker trapped on the outer parapet away from roof access.",
          detailNotes: "Thermal imaging confirmed a human heat signature at the edge of the parapet with dense smoke rising from the central stairwell.",
          lat: 28.6874,
          lng: 77.2412
        }
      ]
    },
    night: {
      id: "night",
      name: "Night",
      description: "FLIR thermal infrared search over unlit forest trails.",
      cases: [
        {
          id: "CASE-04",
          scenario: "night",
          priority: "MEDIUM",
          title: "Thermal Signature on Forest Ridge",
          coordinates: "28.7120° N, 77.2190° E",
          accuracy: "≈28m accuracy",
          verified: false,
          confidence: "87%",
          summary: "Single thermal heat signature moving slowly off-trail.",
          detailNotes: "Radiometric thermal camera detected an isolated heat signature in dense tree canopy.",
          lat: 28.7120,
          lng: 77.2190
        }
      ]
    },
    accident: {
      id: "accident",
      name: "Accident",
      description: "Highway multi-vehicle collision reconnaissance.",
      cases: [
        {
          id: "CASE-05",
          scenario: "accident",
          priority: "HIGH",
          title: "Overturned Vehicle Cabin",
          coordinates: "28.6820° N, 77.2480° E",
          accuracy: "≈12m accuracy",
          verified: false,
          confidence: "90%",
          summary: "Occupant detected in deformed driver compartment.",
          detailNotes: "Optical zoom identified a conscious occupant inside the driver cabin requiring extrication.",
          lat: 28.6820,
          lng: 77.2480
        }
      ]
    },
    earthquake: {
      id: "earthquake",
      name: "Earthquake",
      description: "Structural collapse void space inspection.",
      cases: [
        {
          id: "CASE-06",
          scenario: "earthquake",
          priority: "CRITICAL",
          title: "Pancake Slab Void Space",
          coordinates: "28.6912° N, 77.2215° E",
          accuracy: "≈22m accuracy",
          verified: false,
          confidence: "91%",
          summary: "Motion detected in an aperture between collapsed floor slabs.",
          detailNotes: "Camera detected hand motion through a void opening in the second-story rubble cavity.",
          lat: 28.6912,
          lng: 77.2215
        }
      ]
    }
  },

  // Active cases list loaded dynamically
  activeCases: []
};
