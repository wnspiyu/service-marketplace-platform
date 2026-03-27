import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom icon for task location (red)
const taskIcon = new Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNSIgaGVpZ2h0PSI0MSIgdmlld0JveD0iMCAwIDI1IDQxIj48cGF0aCBmaWxsPSIjZGMzNTQ1IiBkPSJNMTIuNSAwQzUuNiAwIDAgNS42IDAgMTIuNWMwIDguMyAxMi41IDI4LjUgMTIuNSAyOC41czEyLjUtMjAuMiAxMi41LTI4LjVDMjUgNS42IDE5LjQgMCAxMi41IDB6bTAgMTcuNWMtMi44IDAtNS0yLjItNS01czIuMi01IDUtNSA1IDIuMiA1IDUtMi4yIDUtNSA1eiIvPjwvc3ZnPg==',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Custom icon for provider location (green)
const providerIcon = new Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNSIgaGVpZ2h0PSI0MSIgdmlld0JveD0iMCAwIDI1IDQxIj48cGF0aCBmaWxsPSIjMjhhNzQ1IiBkPSJNMTIuNSAwQzUuNiAwIDAgNS42IDAgMTIuNWMwIDguMyAxMi41IDI4LjUgMTIuNSAyOC41czEyLjUtMjAuMiAxMi41LTI4LjVDMjUgNS42IDE5LjQgMCAxMi41IDB6bTAgMTcuNWMtMi44IDAtNS0yLjItNS01czIuMi01IDUtNSA1IDIuMiA1IDUtMi4yIDUtNSA1eiIvPjwvc3ZnPg==',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

interface ServiceProvider {
  id: number;
  businessName?: string;
  firstName: string;
  lastName: string;
  latitude: number;
  longitude: number;
  address: string;
  distanceKm?: number;
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

        {/* Task location marker (red) */}
        <Marker position={taskPosition} icon={taskIcon}>
          <Popup>
            <div style={{ minWidth: '200px' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#dc3545' }}>Task Location</h3>
              <p style={{ margin: '5px 0', fontWeight: 'bold' }}>{task.title}</p>
              <p style={{ margin: '5px 0', fontSize: '12px', color: '#666' }}>
                {task.address}
              </p>
              <p style={{ margin: '5px 0', fontSize: '12px' }}>
                <strong>Search Radius:</strong> {task.searchRadiusKm} km
              </p>
            </div>
          </Popup>
        </Marker>

        {/* Search radius circle */}
        <Circle
          center={taskPosition}
          radius={task.searchRadiusKm * 1000} // Convert km to meters
          pathOptions={{
            color: '#dc3545',
            fillColor: '#dc3545',
            fillOpacity: 0.1,
          }}
        />

        {/* Provider markers (green) */}
        {providers.map((provider) => (
          <Marker
            key={provider.id}
            position={[provider.latitude, provider.longitude]}
            icon={providerIcon}
          >
            <Popup>
              <div style={{ minWidth: '200px' }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#28a745' }}>Service Provider</h3>
                <p style={{ margin: '5px 0', fontWeight: 'bold' }}>
                  {provider.businessName || `${provider.firstName} ${provider.lastName}`}
                </p>
                <p style={{ margin: '5px 0', fontSize: '12px', color: '#666' }}>
                  {provider.address}
                </p>
                {provider.distanceKm !== undefined && (
                  <p style={{ margin: '5px 0', fontSize: '12px' }}>
                    <strong>Distance from task:</strong> {provider.distanceKm.toFixed(2)} km
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Legend */}
      <div style={{
        marginTop: '10px',
        padding: '10px',
        backgroundColor: '#f9f9f9',
        borderRadius: '4px',
        display: 'flex',
        gap: '20px',
        fontSize: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{
            width: '15px',
            height: '15px',
            backgroundColor: '#dc3545',
            borderRadius: '50%'
          }}></div>
          <span>Task Location</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{
            width: '15px',
            height: '15px',
            backgroundColor: '#28a745',
            borderRadius: '50%'
          }}></div>
          <span>Service Providers ({providers.length})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{
            width: '30px',
            height: '2px',
            backgroundColor: '#dc3545',
            opacity: 0.3
          }}></div>
          <span>Search Radius</span>
        </div>
      </div>
    </div>
  );
};

export default TaskMap;
