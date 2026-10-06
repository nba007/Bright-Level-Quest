import { Component, useEffect, useRef, useState, type MutableRefObject, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import FallbackIsland from './FallbackIsland';

type Point = { x: number; z: number };
type Hazard = { x: number; z: number; range: number; speed: number; phase: number };

type LiveState = {
  player: Point;
  stars: Point[];
  hitUntil: number;
  elapsed: number;
  jump: number;
};

type Level = {
  stars: Point[];
  rocks: Point[];
  hazards: Hazard[];
  tint: string;
};

type World3DProps = {
  level: Level;
  gameState: MutableRefObject<LiveState>;
  running: boolean;
};

const STAR_GEOMETRY = (() => {
  const shape = new THREE.Shape();
  for (let point = 0; point < 10; point += 1) {
    const angle = (point / 10) * Math.PI * 2 - Math.PI / 2;
    const radius = point % 2 === 0 ? 0.27 : 0.13;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (point === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.09,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.025,
    bevelThickness: 0.025,
  });
  geometry.center();
  return geometry;
})();

function CameraFit() {
  const { camera, size } = useThree();

  useEffect(() => {
    const isPortrait = size.width / size.height < 1.15;
    camera.position.set(isPortrait ? 8 : 6.6, isPortrait ? 14 : 10, isPortrait ? 12 : 8.8);
    camera.lookAt(0, 0.1, 0);
    camera.updateProjectionMatrix();
  }, [camera, size.height, size.width]);

  return null;
}

function Player({ gameState }: { gameState: MutableRefObject<LiveState> }) {
  const character = useRef<THREE.Group>(null);
  const leaf = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const group = character.current;
    if (!group) return;
    const live = gameState.current;
    group.position.set(live.player.x, live.jump, live.player.z);
    group.rotation.y = 0.12 + Math.sin(clock.elapsedTime * 1.7) * 0.045;
    if (leaf.current) leaf.current.rotation.z = Math.sin(clock.elapsedTime * 3) * 0.13;
  });

  return (
    <group ref={character}>
      <mesh position={[0, 0.47, 0]} castShadow>
        <sphereGeometry args={[0.34, 24, 20]} />
        <meshStandardMaterial color="#f1bd62" roughness={0.74} />
      </mesh>
      <mesh position={[0, 0.54, 0.07]} castShadow>
        <sphereGeometry args={[0.26, 20, 18]} />
        <meshStandardMaterial color="#ffda83" roughness={0.8} />
      </mesh>
      <mesh position={[-0.095, 0.56, 0.29]}>
        <sphereGeometry args={[0.034, 12, 10]} />
        <meshStandardMaterial color="#36504b" />
      </mesh>
      <mesh position={[0.095, 0.56, 0.29]}>
        <sphereGeometry args={[0.034, 12, 10]} />
        <meshStandardMaterial color="#36504b" />
      </mesh>
      <mesh position={[0, 0.47, 0.315]} rotation={[0.12, 0, 0]}>
        <torusGeometry args={[0.067, 0.012, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#9a6048" />
      </mesh>
      <mesh ref={leaf} position={[0.045, 0.84, 0]} rotation={[0.35, 0, -0.55]} castShadow>
        <sphereGeometry args={[0.12, 14, 10]} />
        <meshStandardMaterial color="#71a76b" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.16, 0]} castShadow>
        <sphereGeometry args={[0.22, 16, 12]} />
        <meshStandardMaterial color="#db9850" roughness={0.85} />
      </mesh>
      <mesh position={[-0.22, 0.42, 0]}>
        <sphereGeometry args={[0.095, 12, 10]} />
        <meshStandardMaterial color="#f1bd62" />
      </mesh>
      <mesh position={[0.22, 0.42, 0]}>
        <sphereGeometry args={[0.095, 12, 10]} />
        <meshStandardMaterial color="#f1bd62" />
      </mesh>
    </group>
  );
}

function StarFruit({
  spot,
  index,
  gameState,
  running,
}: {
  spot: Point;
  index: number;
  gameState: MutableRefObject<LiveState>;
  running: boolean;
}) {
  const star = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const mesh = star.current;
    if (!mesh) return;
    const collected = !gameState.current.stars.some(
      (item) => item.x === spot.x && item.z === spot.z,
    );
    mesh.visible = !collected;
    if (running && !collected) {
      mesh.position.y = 0.61 + Math.sin(clock.elapsedTime * 3.2 + index) * 0.075;
      mesh.rotation.y += 0.018;
    }
  });

  return (
    <mesh
      ref={star}
      geometry={STAR_GEOMETRY}
      position={[spot.x, 0.61, spot.z]}
      rotation={[0.22, 0, -0.12]}
      castShadow
    >
      <meshStandardMaterial color="#ffd85f" emissive="#b98628" emissiveIntensity={0.16} roughness={0.43} />
    </mesh>
  );
}

function CrabbyHazard({
  hazard,
  index,
  gameState,
  running,
}: {
  hazard: Hazard;
  index: number;
  gameState: MutableRefObject<LiveState>;
  running: boolean;
}) {
  const crab = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!crab.current || !running) return;
    const time = gameState.current.elapsed;
    crab.current.position.set(
      hazard.x + Math.sin(time * hazard.speed + hazard.phase) * hazard.range,
      0.02,
      hazard.z,
    );
    crab.current.rotation.y = Math.sin(time * hazard.speed + hazard.phase) * 0.2;
  });

  return (
    <group ref={crab} position={[hazard.x, 0.02, hazard.z]}>
      <mesh position={[0, 0.26, 0]} castShadow>
        <sphereGeometry args={[0.3, 18, 14]} />
        <meshStandardMaterial color={index % 2 ? '#df866b' : '#eda062'} roughness={0.65} />
      </mesh>
      <mesh position={[0, 0.36, 0.13]}>
        <sphereGeometry args={[0.18, 16, 12]} />
        <meshStandardMaterial color={index % 2 ? '#f09e7c' : '#f5b775'} />
      </mesh>
      {[-0.075, 0.075].map((offset) => (
        <mesh key={offset} position={[offset, 0.4, 0.285]}>
          <sphereGeometry args={[0.025, 10, 8]} />
          <meshStandardMaterial color="#3e5149" />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.29, 0.25, 0]}>
          <mesh rotation={[0, 0, side * 0.45]}>
            <capsuleGeometry args={[0.035, 0.19, 4, 8]} />
            <meshStandardMaterial color="#d47d62" />
          </mesh>
          <mesh position={[side * 0.11, 0.14, 0]}>
            <sphereGeometry args={[0.09, 12, 10]} />
            <meshStandardMaterial color="#eda062" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Portal({
  gameState,
  running,
}: {
  gameState: MutableRefObject<LiveState>;
  running: boolean;
}) {
  const ring = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ring.current || !running) return;
    ring.current.rotation.y = Math.sin(clock.elapsedTime * 1.2) * 0.08;
    ring.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 2) * 0.025);
  });
  const unlocked = gameState.current.stars.length === 0;

  return (
    <group ref={ring} position={[3.7, 0, -3]}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.52, 0.56, 0.24, 7]} />
        <meshStandardMaterial color="#91a990" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.77, 0]}>
        <torusGeometry args={[0.43, 0.09, 12, 40]} />
        <meshStandardMaterial
          color={unlocked ? '#b2e4c3' : '#6a9c91'}
          emissive={unlocked ? '#71d5ad' : '#35645b'}
          emissiveIntensity={unlocked ? 0.8 : 0.12}
          metalness={0.12}
          roughness={0.35}
        />
      </mesh>
      <mesh position={[0, 0.77, -0.05]}>
        <circleGeometry args={[0.34, 32]} />
        <meshBasicMaterial
          color={unlocked ? '#b8f1ce' : '#719f91'}
          transparent
          opacity={unlocked ? 0.55 : 0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

const TUFTS: Point[] = [
  { x: -4.35, z: -3.2 },
  { x: 4.25, z: 3.1 },
  { x: -4.3, z: 0.1 },
  { x: 4.2, z: -0.9 },
  { x: -0.15, z: -3.55 },
  { x: 0.25, z: 3.45 },
  { x: -3.95, z: 2.95 },
  { x: 3.9, z: -3.3 },
];

function Island({ tint }: { tint: string }) {
  return (
    <>
      <mesh position={[0, -0.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[10, 0.42, 8]} />
        <meshStandardMaterial color="#bf925b" roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.025, 0]} receiveShadow>
        <boxGeometry args={[9.9, 0.12, 7.9]} />
        <meshStandardMaterial color={tint} roughness={0.92} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.038, 0]} receiveShadow>
        <planeGeometry args={[9.72, 7.72]} />
        <meshStandardMaterial color={tint} roughness={1} />
      </mesh>
      {TUFTS.map((point, index) => (
        <group key={index} position={[point.x, 0.04, point.z]}>
          <mesh position={[0, 0.12, 0]} castShadow>
            <sphereGeometry args={[0.18, 10, 8]} />
            <meshStandardMaterial color={index % 2 ? '#6d9e66' : '#789f69'} roughness={0.9} />
          </mesh>
          <mesh position={[0.11, 0.16, 0.04]} castShadow>
            <sphereGeometry args={[0.14, 10, 8]} />
            <meshStandardMaterial color={index % 2 ? '#81ae71' : '#87ad71'} roughness={0.9} />
          </mesh>
        </group>
      ))}
    </>
  );
}

function WorldContents({ level, gameState, running }: World3DProps) {
  return (
    <>
      <color attach="background" args={['#c5e9df']} />
      <ambientLight intensity={0.8} />
      <hemisphereLight args={['#f3ffe9', '#768769', 1.15]} />
      <directionalLight
        castShadow
        position={[-5, 9, 6]}
        intensity={2.1}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      <CameraFit />
      <Island tint={level.tint} />
      {level.rocks.map((rock, index) => (
        <group key={`rock-${index}`} position={[rock.x, 0.05, rock.z]}>
          <mesh position={[0, 0.23, 0]} castShadow receiveShadow>
            <dodecahedronGeometry args={[0.34, 0]} />
            <meshStandardMaterial color={['#8d9f89', '#9cab8d', '#82978a'][index % 3]} roughness={0.94} />
          </mesh>
          <mesh position={[-0.08, 0.38, 0.13]}>
            <sphereGeometry args={[0.06, 10, 8]} />
            <meshStandardMaterial color="#c3cdb3" roughness={0.95} />
          </mesh>
        </group>
      ))}
      {level.stars.map((spot, index) => (
        <StarFruit
          key={`${spot.x}-${spot.z}`}
          spot={spot}
          index={index}
          gameState={gameState}
          running={running}
        />
      ))}
      {level.hazards.map((hazard, index) => (
        <CrabbyHazard
          key={`crab-${index}`}
          hazard={hazard}
          index={index}
          gameState={gameState}
          running={running}
        />
      ))}
      <Portal gameState={gameState} running={running} />
      <Player gameState={gameState} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.48, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#c5e9df" roughness={1} />
      </mesh>
    </>
  );
}

function WebGLBoundary({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  return (
    <WebGLBoundaryImpl fallback={fallback}>
      {children}
    </WebGLBoundaryImpl>
  );
}

class WebGLBoundaryImpl extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function canCreateWebGLContext() {
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
    context?.getExtension('WEBGL_lose_context')?.loseContext();
    return Boolean(context);
  } catch {
    return false;
  }
}

export default function World3D({ level, gameState, running }: World3DProps) {
  const [webglAvailable] = useState(canCreateWebGLContext);
  const fallback = <FallbackIsland level={level} gameState={gameState} />;
  if (!webglAvailable) return fallback;

  return (
    <WebGLBoundary fallback={fallback}>
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [6.6, 10, 8.8], fov: 40, near: 0.1, far: 70 }}
        gl={{ antialias: true, alpha: false }}
        aria-label="Three-dimensional island game"
      >
        <WorldContents level={level} gameState={gameState} running={running} />
      </Canvas>
    </WebGLBoundary>
  );
}
