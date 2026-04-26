# Distance Calculation and OpenStreetMap Integration

## Overview

This document explains how the application calculates the distance between two geographic points, where that calculation is used across the backend and frontend, and how OpenStreetMap powers the map rendering that visually communicates those distances and locations to the user.

---

## 1. The Problem

When a customer creates a task at a specific location, the system needs to find all service providers who are:
1. In the same service category as the task
2. Located within the customer's specified search radius (in kilometres)

This requires measuring the real-world distance between the task's GPS coordinates and each provider's GPS coordinates. Simple subtraction of coordinates does not work because the Earth is a sphere, not a flat plane. One degree of latitude is approximately 111 km everywhere, but one degree of longitude varies from roughly 111 km at the equator to 0 km at the poles.

The solution is the **Haversine formula**, which calculates the shortest distance between two points on a sphere given their latitude and longitude.

---

## 2. The Haversine Formula

### Mathematical Definition

Given two points on Earth:
- Point A: latitude `lat1`, longitude `lon1`
- Point B: latitude `lat2`, longitude `lon2`

```
Δlat = lat2 - lat1  (in radians)
Δlon = lon2 - lon1  (in radians)

a = sin²(Δlat / 2) + cos(lat1) × cos(lat2) × sin²(Δlon / 2)

c = 2 × atan2( √a, √(1 - a) )

distance = R × c
```

Where:
- `R` = 6371 km (Earth's mean radius)
- `atan2` is the two-argument arctangent function
- The result `distance` is in kilometres

### Why Haversine?

The Haversine formula is the standard algorithm for this problem because:
- It accounts for the spherical shape of the Earth
- It is numerically stable for both short distances and long distances
- It does not require any external library or database extension
- The error margin compared to more complex ellipsoidal models (like Vincenty) is at most 0.3%, which is acceptable for a service-radius matching problem

---

## 3. Backend Implementation

The calculation lives entirely in `LocationService.java`:

```java
public double calculateDistance(BigDecimal lat1, BigDecimal lon1,
                                BigDecimal lat2, BigDecimal lon2) {
    final int EARTH_RADIUS_KM = 6371;

    double dLat = Math.toRadians(lat2.doubleValue() - lat1.doubleValue());
    double dLon = Math.toRadians(lon2.doubleValue() - lon1.doubleValue());

    double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
               Math.cos(Math.toRadians(lat1.doubleValue())) *
               Math.cos(Math.toRadians(lat2.doubleValue())) *
               Math.sin(dLon / 2) * Math.sin(dLon / 2);

    double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return EARTH_RADIUS_KM * c;
}
```

**Line-by-line explanation:**

| Line | What It Does |
|---|---|
| `dLat = toRadians(lat2 - lat1)` | Converts the latitude difference from degrees to radians |
| `dLon = toRadians(lon2 - lon1)` | Converts the longitude difference from degrees to radians |
| `sin(dLat/2) * sin(dLat/2)` | Computes the sin² of half the latitude difference |
| `cos(lat1) * cos(lat2) * sin(dLon/2) * sin(dLon/2)` | Accounts for the longitude difference weighted by latitude (shrinks near poles) |
| `a = (sum of above)` | The intermediate "haversine" value, always between 0 and 1 |
| `c = 2 * atan2(√a, √(1-a))` | The central angle in radians between the two points |
| `EARTH_RADIUS_KM * c` | Converts the angle to a distance in km using Earth's radius |

**Why `BigDecimal` inputs converted to `double` for the calculation?**
GPS coordinates are stored as `BigDecimal` in the database and entity classes to preserve precision without floating-point rounding issues during storage. However, Java's `Math` library (`sin`, `cos`, `atan2`) operates on `double` primitives. The conversion to `double` for the calculation is acceptable because the trigonometric functions do not need more precision than `double` provides (approximately 15 significant digits).

---

## 4. Where Distance Calculation is Used in the Backend

### 4.1 During Task Creation (Provider Matching)

When a customer creates a task, `TaskService` calls:

```java
List<ServiceProviderProfile> matchedProviders =
    locationService.findProvidersWithinRadius(
        task.getLatitude(),
        task.getLongitude(),
        task.getSearchRadiusKm(),
        task.getCategory().getId()
    );
```

Inside `findProvidersWithinRadius`:

```java
public List<ServiceProviderProfile> findProvidersWithinRadius(
        BigDecimal latitude, BigDecimal longitude,
        Integer radiusKm, Long categoryId) {

    // Step 1: narrow candidates to correct category
    List<ServiceProviderProfile> allProviders =
        providerRepository.findByCategoryId(categoryId);

    // Step 2: filter by distance
    return allProviders.stream()
            .filter(provider -> {
                double distance = calculateDistance(
                    latitude, longitude,
                    provider.getLatitude(), provider.getLongitude()
                );
                return distance <= radiusKm;
            })
            .collect(Collectors.toList());
}
```

**Two-step filtering:**

1. The first filter (SQL) retrieves all providers in the matching category, significantly reducing the candidate list before the distance calculation runs.
2. The second filter (Java stream) applies Haversine to each remaining provider and keeps only those within `searchRadiusKm`.

Every provider that passes both filters receives a `TaskNotification` record and an email.

### 4.2 In Notification Responses

When a provider loads their notifications, the backend calculates and includes the distance from the provider to each task:

```java
// In NotificationService.mapToNotificationResponse()
double distance = locationService.calculateDistance(
    providerProfile.getLatitude(),
    providerProfile.getLongitude(),
    notification.getTask().getLatitude(),
    notification.getTask().getLongitude()
);
response.setDistanceKm(Math.round(distance * 10.0) / 10.0);  // rounded to 1 decimal place
```

This tells the provider "this job is 4.7 km from you" without the frontend needing to calculate it.

---

## 5. OpenStreetMap Integration in the Frontend

The frontend uses **Leaflet** and **React Leaflet** to render interactive maps that visually show locations, distances, and coverage areas. All map tiles are served by **OpenStreetMap**, which is free and requires no API key.

### 5.1 How OpenStreetMap Tiles Work

A map is composed of small square images called **tiles**. Each tile covers a fixed geographic area at a specific zoom level. When the user pans or zooms the map, Leaflet requests the appropriate tiles from the OpenStreetMap tile server:

```
https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
```

Where:
- `{s}` is the subdomain (`a`, `b`, or `c`) for load balancing across tile servers
- `{z}` is the zoom level (0 = whole world, 19 = street level)
- `{x}` and `{y}` are the tile coordinates at that zoom level

Leaflet handles all tile fetching, caching, and rendering automatically. The application only needs to configure the tile URL.

### 5.2 Package Setup

```json
"leaflet": "1.9.4",
"react-leaflet": "4.2.1",
"@types/leaflet": "1.9.8"
```

The Leaflet CSS must be imported globally for markers and popups to render correctly:

```typescript
// In App.tsx
import 'leaflet/dist/leaflet.css';
```

Without this import, map controls and popups appear without styling.

---

## 6. `TaskMap.tsx` - The Distance Visualisation Component

`TaskMap.tsx` is the component that shows the relationship between a task location and all service providers who were notified. It is rendered on the customer's `TaskDetails` page.

### 6.1 Component Interface

```typescript
interface ServiceProvider {
    id: number;
    businessName?: string;
    firstName: string;
    lastName: string;
    latitude: number;
    longitude: number;
    address: string;
    distanceKm?: number;       // pre-calculated by backend, displayed in popup
}

interface Task {
    id: number;
    title: string;
    latitude: number;
    longitude: number;
    address: string;
    searchRadiusKm: number;
}

interface TaskMapProps {
    task: Task;
    providers?: ServiceProvider[];
}
```

The `distanceKm` on each provider is already calculated by the backend (`NotificationService`) and returned in the API response. The map component just displays the value; it does not recalculate it.

### 6.2 Custom Map Markers

Default Leaflet markers are PNG images loaded from a file path. This causes issues in Create React App builds where the file path resolves incorrectly. The solution is to embed the marker SVG directly as a base64 data URI inside the `Icon` constructor:

**Red marker (task location):**
```typescript
const taskIcon = new Icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0i...',  // red pin SVG
    iconSize: [25, 41],      // standard Leaflet marker dimensions
    iconAnchor: [12, 41],    // bottom centre of icon anchors to coordinates
    popupAnchor: [1, -34],   // popup opens above the anchor point
});
```

**Green marker (provider location):**
```typescript
const providerIcon = new Icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0i...',  // green pin SVG
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});
```

`iconAnchor: [12, 41]` means the point 12 pixels from the left and 41 pixels from the top of the icon image (the very bottom centre of the pin) is placed exactly at the coordinate. This makes the pin tip point at the correct location.

### 6.3 Map Rendering

```tsx
const TaskMap: React.FC<TaskMapProps> = ({ task, providers = [] }) => {
    const taskPosition: [number, number] = [task.latitude, task.longitude];

    return (
        <div style={{ width: '100%', height: '500px', marginTop: '20px' }}>
            <MapContainer
                center={taskPosition}
                zoom={11}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                ...
            </MapContainer>
        </div>
    );
};
```

- `center={taskPosition}` sets the initial map centre to the task's coordinates
- `zoom={11}` shows roughly a 30-50 km area, suitable for viewing a task and nearby providers
- The `attribution` prop is required by OpenStreetMap's usage policy; it renders as a small credit link at the bottom-right of the map

### 6.4 Task Marker and Popup

```tsx
<Marker position={taskPosition} icon={taskIcon}>
    <Popup>
        <div style={{ minWidth: '200px' }}>
            <h3 style={{ color: '#dc3545' }}>Task Location</h3>
            <p style={{ fontWeight: 'bold' }}>{task.title}</p>
            <p style={{ fontSize: '12px', color: '#666' }}>{task.address}</p>
            <p style={{ fontSize: '12px' }}>
                <strong>Search Radius:</strong> {task.searchRadiusKm} km
            </p>
        </div>
    </Popup>
</Marker>
```

Clicking the red marker opens a popup showing the task title, address, and the search radius that was used to find providers.

### 6.5 Search Radius Circle

```tsx
<Circle
    center={taskPosition}
    radius={task.searchRadiusKm * 1000}   // Leaflet expects metres, not km
    pathOptions={{
        color: '#dc3545',
        fillColor: '#dc3545',
        fillOpacity: 0.1,
    }}
/>
```

`radius` in Leaflet's `Circle` component is in **metres**. Since `searchRadiusKm` is stored in kilometres, it is multiplied by 1000 before passing to the component. The result is a semi-transparent red circle drawn on the map showing the exact area within which providers were searched. Providers inside this circle were notified; providers outside it were not.

### 6.6 Provider Markers and Popups

```tsx
{providers.map((provider) => (
    <Marker
        key={provider.id}
        position={[provider.latitude, provider.longitude]}
        icon={providerIcon}
    >
        <Popup>
            <div style={{ minWidth: '200px' }}>
                <h3 style={{ color: '#28a745' }}>Service Provider</h3>
                <p style={{ fontWeight: 'bold' }}>
                    {provider.businessName || `${provider.firstName} ${provider.lastName}`}
                </p>
                <p style={{ fontSize: '12px', color: '#666' }}>{provider.address}</p>
                {provider.distanceKm !== undefined && (
                    <p style={{ fontSize: '12px' }}>
                        <strong>Distance from task:</strong> {provider.distanceKm.toFixed(2)} km
                    </p>
                )}
            </div>
        </Popup>
    </Marker>
))}
```

One green marker is placed for each provider in the `providers` array. The popup shows:
- Business name if set, otherwise first name + last name
- Provider's registered address
- Distance from the task (`distanceKm.toFixed(2)` formats it to 2 decimal places)

The `distanceKm` value displayed here comes directly from the API response (`GET /api/customer/tasks/{taskId}/providers`), where the backend already calculated it using Haversine. The frontend just renders the number.

`provider.businessName || \`${provider.firstName} ${provider.lastName}\`` means: if the provider set a business name during registration, show that; otherwise fall back to their personal name.

### 6.7 Map Legend

A plain HTML legend is rendered below the `MapContainer` (outside the map itself, since it is a static UI element):

```tsx
<div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f9f9f9',
              borderRadius: '4px', display: 'flex', gap: '20px', fontSize: '14px' }}>
    <div>
        <div style={{ width: '15px', height: '15px', backgroundColor: '#dc3545',
                      borderRadius: '50%' }}></div>
        <span>Task Location</span>
    </div>
    <div>
        <div style={{ width: '15px', height: '15px', backgroundColor: '#28a745',
                      borderRadius: '50%' }}></div>
        <span>Service Providers ({providers.length})</span>
    </div>
    <div>
        <div style={{ width: '30px', height: '2px', backgroundColor: '#dc3545',
                      opacity: 0.3 }}></div>
        <span>Search Radius</span>
    </div>
</div>
```

The legend shows a coloured dot for each marker type and a faded red line representing the radius circle. `providers.length` shows the count of notified providers in the legend label.

---

## 7. How Distance Flows from Backend to Map

```
Customer creates task at (6.9271, 79.8612) with searchRadiusKm = 30
          |
          v
TaskService calls LocationService.findProvidersWithinRadius()
          |
          v
Haversine calculates distance from task to each provider in category
Provider A (Dehiwala): 3.7 km   <- within 30 km, INCLUDED
Provider B (Kandy):   101 km   <- outside 30 km, EXCLUDED
          |
          v
TaskNotification rows saved for Provider A only
          |
          v
Customer opens TaskDetails page
          |
          v
GET /api/customer/tasks/{taskId}/providers
Backend loads notified providers with their coordinates
Backend adds distanceKm to each provider in the response:
[
  { id: 5, firstName: "Nimal", latitude: 6.8935, longitude: 79.8627, distanceKm: 3.7 }
]
          |
          v
TaskMap component receives: task (coordinates + radius) + providers (coordinates + distanceKm)
          |
          v
MapContainer renders OpenStreetMap tiles centred on task
Red marker placed at task coordinates
Red semi-transparent circle drawn at searchRadiusKm * 1000 metres
Green marker placed at Provider A's coordinates
Popup shows: "Distance from task: 3.70 km"
```

---

## 8. Concrete Example

**Scenario:** A customer in Colombo creates a plumbing task with a 30 km search radius.

```
Task location:    lat = 6.9271,  lon = 79.8612  (Colombo Fort)
Provider A:       lat = 6.8935,  lon = 79.8627  (Dehiwala)
Provider B:       lat = 7.2906,  lon = 80.6337  (Kandy)
Search radius:    30 km
```

**Haversine calculation for Provider A (Dehiwala):**
```
dLat = toRadians(6.8935 - 6.9271) = toRadians(-0.0336) = -0.000586 rad
dLon = toRadians(79.8627 - 79.8612) = toRadians(0.0015) = 0.0000262 rad

a = sin²(-0.000293) + cos(0.1209) × cos(0.1203) × sin²(0.0000131)
  = 0.0000000858 + (0.9927 × 0.9928 × 0.000000000172)
  ≈ 0.0000000858

c = 2 × atan2(√0.0000000858, √(1 - 0.0000000858)) ≈ 0.000585 rad

distance = 6371 × 0.000585 ≈ 3.73 km
```

3.73 km is within the 30 km radius. Provider A is notified and appears on the map.

**Haversine calculation for Provider B (Kandy):**
Distance is approximately 101 km, well outside the 30 km radius. Provider B is not notified and does not appear on the map.

**What the customer sees on `TaskDetails`:**
- Map centred on Colombo Fort
- Red pin at Colombo Fort with popup: "Search Radius: 30 km"
- Red semi-transparent circle showing the 30 km coverage area
- Green pin at Dehiwala with popup: "Distance from task: 3.73 km"
- Legend below the map showing Task Location, 1 Service Provider, Search Radius

---

