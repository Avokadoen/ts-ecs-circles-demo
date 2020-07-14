import { fromEvent } from 'rxjs';
import { ECSManager, registerComponentType, addComponent, Component, registerSystem, registerEvent } from 'naive-ts-ecs';

// source: for random color: https://stackoverflow.com/questions/1484506/random-color-generator#comment6801353_5365036

// create some types that represent components
interface Circle {
  radius: number;
}

interface Position {
  x: number;
  y: number;
}

interface Velocity {
  x: number;
  y: number;
}

interface Colored {
  color: string;
}


interface UniqueTag {}

// create a manager
const manager = new ECSManager();

// register your types in the manager with default values
registerComponentType<Circle>(manager, { radius: 10 });
registerComponentType<Position>(manager, { x: 0, y: 0 });
registerComponentType<Velocity>(manager, { x: 0, y: 0 });
registerComponentType<Colored>(manager, { color: '#ff0000' });
registerComponentType<UniqueTag>(manager, { });


fromEvent(window, 'DOMContentLoaded').subscribe(() => {
  const canvas = document.getElementById('waveShootCanvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('failed to load canvas!');
    return;
  }

  const ctx = canvas.getContext('2d');

  // create entities and attach components to them
  const createCircleEntity = (posX: number, posY: number) => {
    const circleMaxSize = 40;
    const { entityId } = manager.createEntity();
    const radius = Math.random() * circleMaxSize;
    addComponent<Circle>(manager, entityId, { radius: radius });
    addComponent<Position>(manager, entityId, { x: posX, y: posY });
    addComponent<Velocity>(manager, entityId, { x: Math.random() * 8 + 2, y: Math.random() * 8 + 2});
    addComponent<Colored>(manager, entityId, { color: '#'+(Math.random()*0xFFFFFF<<0).toString(16) });
  }
  
  // We initially create 50
  for (let i = 0; i < 50; i++) {
    createCircleEntity(Math.random() * canvas.width, Math.random() * canvas.height);
  }

  // create systems that will run each frame 
  // all systems take in delta time as their first argument (the time since last frame)
  // all other arguments needs to be wrapped in a Component<T>
  const drawCircleSystem = (_dt: number, circle: Component<Circle>, pos: Component<Position>, color: Component<Colored>) => {
    ctx.beginPath();
    ctx.strokeStyle = color.data.color;
    ctx.arc(pos.data.x, pos.data.y, circle.data.radius, 0, 2 * Math.PI);
    ctx.stroke();
  }

  // For simple query requirements ts-ecs can generate the query for you base on your system
  // Simple meaning only "AND" so in this case we ask for all entities with circle and position and color
  registerSystem(manager, drawCircleSystem);

  const moveCircleSystem = (dt: number, pos: Component<Position>, vel: Component<Velocity>) => {
    pos.data.x += vel.data.x * dt;
    pos.data.y += vel.data.y * dt;
  }
  registerSystem(manager, moveCircleSystem);

  const resetPosSystem = (_dt: number, pos: Component<Position>, circle: Component<Circle>) => {
    if (pos.data.x - circle.data.radius * 2 > canvas.width 
      && pos.data.y - circle.data.radius * 2 > canvas.height) {
        pos.data.x = -Math.random() * (canvas.width * 0.05);
        pos.data.y = -Math.random() * (canvas.height * 0.05);
      } 
  }
  registerSystem(manager, resetPosSystem);

  const { entityId } = manager.createEntity();
  addComponent<UniqueTag>(manager, entityId, { });
  
  // create events that will run on request/event
  const spawnCircleEvent = (event: Event, _unique: Component<UniqueTag>) => {
    const e = event as MouseEvent;
    
    createCircleEntity(e.x - canvas.offsetLeft, e.y - canvas.offsetTop)
  }

  // events are rather primitive and needs to be called manually with the id 
  // returned by the register function
  const onUserClick = registerEvent(manager, spawnCircleEvent);
  fromEvent(canvas, 'click').subscribe(e => manager.onEvent(onUserClick, e));


  const tick = () => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    manager.dispatch();
    
    window.requestAnimationFrame(tick);
  };
  
  window.requestAnimationFrame(tick);
});