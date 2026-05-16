import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { 
  Stars, 
  Sparkles, 
  Float, 
  CameraControls,
  Text,
  Billboard
} from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import { easing } from 'maath';
import { HAPPINESS_DATA, FLAG_COLORS, CountryData } from '../constants';

// --- Types ---
interface WorldHappinessCanvasProps {
  selectedCountry: CountryData | null;
  onSelectCountry: (country: CountryData | null) => void;
  filteredCountries: CountryData[];
}

// --- Helpers ---
const HELIX_RADIUS = 12;
const HELIX_HEIGHT_SCALE = 5; // Vertical distance factor
const SPHERE_SIZE_BASE = 0.5;

// Convert country data to 3D positions (Stable Layout)
// We compute this ONCE for the entire dataset so positions don't jump when filtering
const useAllCountryPositions = (allData: CountryData[]) => {
  return useMemo(() => {
    // Sort by ladder score descending (highest at top) for the helix shape
    const sorted = [...allData].sort((a, b) => a["Ladder score"] - b["Ladder score"]);
    
    return sorted.map((country, index) => {
      // Helix Math
      const angle = index * 0.4; // Radians per step
      const y = (country["Ladder score"] - 1.5) * HELIX_HEIGHT_SCALE - 15; // Centering vertically roughly
      const x = HELIX_RADIUS * Math.cos(angle);
      const z = HELIX_RADIUS * Math.sin(angle);
      
      const colorHex = FLAG_COLORS[country["Country name"]]?.[0] || "#ffffff";
      const color = new THREE.Color(colorHex);

      return {
        ...country,
        position: new THREE.Vector3(x, y, z),
        color,
        index
      };
    });
  }, [allData]);
};

// --- Sub-Components ---

interface CountrySphereProps {
  data: CountryData;
  position: THREE.Vector3;
  color: THREE.Color;
  isSelected: boolean;
  isVisible: boolean;
  onSelect: (data: CountryData) => void;
}

const CountrySphere: React.FC<CountrySphereProps> = ({ 
  data, 
  position, 
  color, 
  isSelected, 
  isVisible,
  onSelect 
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHover] = useState(false);
  
  // Animate visual properties
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    // Smooth Scale: If not visible, scale to 0
    const targetScale = !isVisible ? 0 : isSelected ? 1.8 : hovered ? 1.5 : 1;
    easing.damp3(meshRef.current.scale, [targetScale, targetScale, targetScale], 0.2, delta);

    // Smooth Emissive Intensity
    // @ts-ignore
    const targetIntensity = isSelected ? 4.0 : hovered ? 2.5 : 0.8;
    // @ts-ignore
    easing.damp(meshRef.current.material, 'emissiveIntensity', targetIntensity, 0.15, delta);
  });

  return (
    <group position={position}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <mesh 
          ref={meshRef}
          onClick={(e) => {
            e.stopPropagation();
            if (isVisible) onSelect(data);
          }}
          onPointerOver={() => {
            if (isVisible) {
              document.body.style.cursor = 'pointer';
              setHover(true);
            }
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'default';
            setHover(false);
          }}
        >
          <sphereGeometry args={[SPHERE_SIZE_BASE, 32, 32]} />
          <meshPhysicalMaterial 
            color={color}
            emissive={color}
            emissiveIntensity={0.5}
            roughness={0.1}
            metalness={0.1}
            transmission={0.6} // Glassy
            thickness={1}
            clearcoat={1}
            clearcoatRoughness={0.1}
            transparent
            opacity={isVisible ? 1 : 0}
          />
        </mesh>
        
        {/* Label only visible when hovered or selected AND the sphere is visible */}
        {isVisible && (hovered || isSelected) && (
          <Billboard position={[0, isSelected ? 1.2 : 0.8, 0]}>
            <Text
              fontSize={0.5}
              color="white"
              anchorX="center"
              anchorY="middle"
              font="https://fonts.gstatic.com/s/spacegrotesk/v16/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj52lPM.woff"
            >
              {data["Country name"]}
            </Text>
          </Billboard>
        )}
      </Float>
    </group>
  );
};

const SceneContent = ({ 
  selectedCountry, 
  onSelectCountry,
  filteredCountries
}: WorldHappinessCanvasProps) => {
  // We use the ALL positions hook to ensure layout stability
  const allPoints = useAllCountryPositions(HAPPINESS_DATA);
  const cameraControlsRef = useRef<CameraControls>(null);

  // Helper to check if a country is currently in the filtered list
  const isCountryVisible = (name: string) => {
    return filteredCountries.some(c => c["Country name"] === name);
  };

  // Camera "Fly-To" Logic
  useEffect(() => {
    if (selectedCountry && cameraControlsRef.current) {
      // Find the position of the selected country in the ALL points array
      const target = allPoints.find(p => p["Country name"] === selectedCountry["Country name"]);
      
      if (target) {
        // Calculate a nice viewing position relative to the sphere
        const offset = target.position.clone().normalize().multiplyScalar(4); // 4 units away
        const camPos = target.position.clone().add(offset);
        camPos.y += 0.5;

        cameraControlsRef.current.setLookAt(
          camPos.x, camPos.y, camPos.z,
          target.position.x, target.position.y, target.position.z,
          true // Animate
        );
      }
    } else if (!selectedCountry && cameraControlsRef.current) {
      // Reset to a nice establishing shot
      cameraControlsRef.current.setLookAt(
        0, 5, 45, // Position slightly further back to see context
        0, 10, 0, // Target
        true
      );
    }
  }, [selectedCountry, allPoints]);

  return (
    <>
      <group>
        {allPoints.map((p) => (
          <CountrySphere 
            key={p["Country name"]}
            data={p}
            position={p.position}
            color={p.color}
            isSelected={selectedCountry?.["Country name"] === p["Country name"]}
            isVisible={isCountryVisible(p["Country name"])}
            onSelect={onSelectCountry}
          />
        ))}
      </group>
      
      <CameraControls 
        ref={cameraControlsRef} 
        minPolarAngle={Math.PI / 4} 
        maxPolarAngle={Math.PI / 1.8}
        minDistance={5}
        maxDistance={80}
      />
    </>
  );
};

const WorldHappinessCanvas: React.FC<WorldHappinessCanvasProps> = (props) => {
  return (
    <div className="w-full h-full bg-[#050510]">
      <Canvas 
        camera={{ position: [0, 5, 40], fov: 45 }}
        gl={{ antialias: false }} // Optimization for postprocessing
        dpr={[1, 1.5]} // Optimization for varying screen densities
      >
        <color attach="background" args={['#050510']} />
        
        {/* Environment / Lighting */}
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 20, 10]} intensity={1} color="#ffffff" />
        <pointLight position={[-10, -20, -10]} intensity={0.5} color="#4f46e5" />
        
        {/* Particles / Starfield */}
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <Sparkles count={200} scale={30} size={4} speed={0.4} opacity={0.5} color="#f0abfc" />

        {/* Content */}
        <SceneContent {...props} />

        {/* Effects */}
        <EffectComposer disableNormalPass>
          <Bloom 
            luminanceThreshold={1.1} // Only very bright things glow
            mipmapBlur 
            intensity={0.6} 
            radius={0.6}
          />
          <Vignette eskil={false} offset={0.1} darkness={0.5} />
          <Noise opacity={0.05} />
        </EffectComposer>
        
        <mesh 
          visible={false} 
          position={[0,0,0]} 
          onClick={(e) => {
             if (e.targetObject === e.eventObject) {
               props.onSelectCountry(null);
             }
          }}
        >
           <sphereGeometry args={[100, 16, 16]} side={THREE.BackSide} />
        </mesh>

      </Canvas>
    </div>
  );
};

export default WorldHappinessCanvas;