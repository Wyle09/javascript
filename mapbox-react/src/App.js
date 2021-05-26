import React, { useState, useRef } from "react"
import ReactMapGL, { Marker, FlyToInterpolator, Popup } from "react-map-gl"
import axios from "axios"
import useSWR from "swr"
import 'mapbox-gl/dist/mapbox-gl.css'
import "./App.css"
import useSupercluster from "use-supercluster"

const fetcher = (url) => axios.get(url).then(resp => ({ ...resp.data }));

export default function App() {

  // Setup map
  const [viewport, setViewport] = useState({
    latitude: 39.9526,
    longitude: -75.1652,
    width: window.innerWidth,
    height: window.innerHeight,
    zoom: 12,
    pitch: 50
  });

  const mapRef = useRef();
  const apiEndPoint = (startDate, endDate) => `https://phl.carto.com/api/v2/sql?q=SELECT * FROM incidents_part1_part2 WHERE dispatch_date BETWEEN '${startDate}' AND '${endDate}'`;
  const { data, error } = useSWR(apiEndPoint("2021-01-01", "2021-12-31"), fetcher, { revalidatxeOnFocus: false });
  const crimes = data && !error ? data.rows : [];
  const points = crimes.map((crime) => ({
    "type": "Feature",
    "properties": { "cluster": false, "crimeId": crime.cartodb_id, "category": crime.text_general_code },
    "geometry": { "type": "Points", "coordinates": [crime.point_x, crime.point_y] }
  }))
    .filter((crime) => (crime.geometry.coordinates[0] != null && crime.geometry.coordinates[1] != null) ? crime : null);

  // get map bounds
  const bounds = mapRef.current
    ? mapRef.current
      .getMap()
      .getBounds()
      .toArray()
      .flat()
    : null;

  // get clusters
  const { clusters, supercluster } = useSupercluster({
    points: points,
    zoom: viewport.zoom,
    bounds: bounds,
    options: { radius: 100, maxZoom: 23, minZoom: 5 }
  });

  // return map
  return (
    <ReactMapGL
      {...viewport}
      maxZoom={20}
      mapboxApiAccessToken=""
      mapStyle="mapbox://styles/wylecordero/ckngmxvyx013p17o5fe7ygctu"
      onViewportChange={(newViewport) => { setViewport({ ...newViewport }) }}
      ref={mapRef}
    >
      { clusters.map(cluster => {
        const [long, lat] = cluster.geometry.coordinates
        const { cluster: isCluster, point_count: pointCount } = cluster.properties

        if (isCluster) {
          return (
            <Marker key={cluster.id} latitude={lat} longitude={long}>
              <div
                className="cluster-marker"
                style={{
                  width: `${20 + (pointCount / points.length) * 550}px`,
                  height: `${20 + (pointCount / points.length) * 550}px`,
                  background: "#ff9705"
                }}

                onClick={() => {
                  const expansionZoom = Math.min(
                    supercluster.getClusterExpansionZoom(cluster.id), 20
                  )

                  setViewport({
                    ...viewport,
                    lat,
                    long,
                    zoom: expansionZoom,
                    transitionInterpolator: new FlyToInterpolator({ speed: 2, transitionDuration: "auto"})
                  })
                }}
              >
                {pointCount}
              </div>
            </Marker>
          )
        }

        return (
          <Marker key={cluster.properties.crimeId} latitude={lat} longitude={long}>
            <div
              onClick={() => {
                alert(cluster.properties.category)
              }}
            >
              <button className="crime-marker">
                <img src="/crime_icon.png" alt=""/>
              </button>
            </div>
          </Marker>
        )

      })};

    </ReactMapGL>
  );
};
