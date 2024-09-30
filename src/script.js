import * as THREE from 'three';
// eslint-disable-next-line import/extensions
import TWEEN from 'three/examples/jsm/libs/tween.module.js';
// eslint-disable-next-line import/extensions
import Stats from 'three/examples/jsm/libs/stats.module.js';
// eslint-disable-next-line import/no-extraneous-dependencies
import * as dat from 'lil-gui';
import init from './init';
import './style.css';

// ------------------------------------Ініціалізація базових об'єктів Three.js
const { sizes, camera, scene, canvas, controls, renderer } = init();
camera.position.z = 25;

// ------------------------------------Створення статистики для моніторингу продуктивності
const stats = new Stats();
stats.showPanel(0);
document.body.appendChild(stats.dom);

// ------------------------------------GUI для управління параметрами
const gui = new dat.GUI({ closeFolders: true });

// ------------------------------------Створення групи геометричних об'єктів
const group = new THREE.Group();
const geometries = [
	new THREE.BoxGeometry(1, 1, 1),
	new THREE.ConeGeometry(1, 2, 32, 1),
	new THREE.RingGeometry(0.5, 1, 16),
	new THREE.TorusGeometry(1, 0.5, 16, 100),
	new THREE.DodecahedronGeometry(1, 0),
	new THREE.SphereGeometry(1, 32, 16),
	new THREE.TorusKnotGeometry(1, 0.25, 100, 16, 1, 5),
	new THREE.OctahedronGeometry(1, 0),
	new THREE.CylinderGeometry(0.5, 1, 2, 16, 4),
];

const param = { color: '0x00ffe1' };

// Додаємо Ambient Light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Додаємо Directional Light
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// Додаємо Point Light
const pointLight = new THREE.PointLight(0xffffff, 1, 100);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

const guiElMaterial = gui.addFolder('Elements');
let index = 0;
let activeIndex = -1;
for (let i = -5; i <= 5; i += 5) {
	for (let j = -5; j <= 5; j += 5) {
		const material = new THREE.MeshStandardMaterial({
			color: param.color,
			wireframe: false,
		});

		// Додаємо можливість зміни кольору та wireframe через GUI
		guiElMaterial.add(material, 'wireframe');
		guiElMaterial
			.addColor(param, 'color')
			.onChange(() => material.color.set(param.color));

		const mesh = new THREE.Mesh(geometries[index], material);
		mesh.position.set(i, j, 10);
		mesh.index = index;
		mesh.basePosition = new THREE.Vector3(i, j, 10);
		group.add(mesh);
		index += 1;
	}
}

// Додаємо GUI для масштабування групи
const guiScale = gui.addFolder('Scale');
guiScale.add(group.scale, 'x').min(0).max(5).step(0.1).name('Box scale X');
guiScale.add(group.scale, 'y').min(0).max(5).step(0.1).name('Box scale Y');
guiScale.add(group.scale, 'z').min(0).max(5).step(0.1).name('Box scale Z');
gui.add(group, 'visible');

scene.add(group);

// ------------------------------------ Налаштування фону
const loader = new THREE.TextureLoader();
loader.load('./bg.webp', (texture) => {
	// Створюємо копію текстури, щоб уникнути модифікації параметра
	const bgTexture = texture.clone();

	// Встановлюємо повтор по осях, щоб уникнути розтягування
	bgTexture.wrapS = THREE.MirroredRepeatWrapping; // Повтор по горизонталі з дзеркальним відображенням
	bgTexture.wrapT = THREE.MirroredRepeatWrapping; // Повтор по вертикалі з дзеркальним відображенням

	// Встановлюємо масштабування повтору для адаптації до будь-яких розмірів
	bgTexture.repeat.set(window.innerWidth / 1000, window.innerHeight / 1000);

	// Додаємо фон до сцени
	scene.background = bgTexture;
});

// --------------------------- Оновлюємо розмір сцени та камери при зміні розміру вікна
window.addEventListener('resize', () => {
	const width = window.innerWidth;
	const height = window.innerHeight;

	camera.aspect = width / height;
	camera.updateProjectionMatrix();

	renderer.setSize(width, height);

	// Оновлення масштабу текстури фону
	scene.background.repeat.set(width / 1000, height / 1000);
});

// ------------------------------------ Функція для обнуления активного елемента
const resetActive = () => {
	group.children[activeIndex].material.color.set('white');
	new TWEEN.Tween(group.children[activeIndex].position)
		.to(
			{
				x: group.children[activeIndex].basePosition.x,
				y: group.children[activeIndex].basePosition.y,
				z: group.children[activeIndex].basePosition.z,
			},
			Math.random() * 1000 + 1000,
		)
		.easing(TWEEN.Easing.Exponential.InOut)
		.start();
	activeIndex = -1;
};

// ------------------------------------ Оновлюємо сцену і камеру у циклі
const clock = new THREE.Clock();
const tick = () => {
	stats.begin();
	const delta = clock.getDelta();

	if (activeIndex !== -1) {
		group.children[activeIndex].rotation.y += delta * 0.7;
	}
	controls.update();
	TWEEN.update();
	renderer.render(scene, camera);
	stats.end();
	window.requestAnimationFrame(tick);
};
tick();

// ------------------------------------ Налаштування події кліку для вибору елемента
const raycaster = new THREE.Raycaster();
const handleClick = (e) => {
	const pointer = new THREE.Vector2();
	pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
	pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;

	raycaster.setFromCamera(pointer, camera);
	const intersections = raycaster.intersectObjects(group.children);

	if (activeIndex !== -1) {
		resetActive();
	}

	for (let ind = 0; ind < intersections.length; ind += 1) {
		intersections[ind].object.material.color.set('purple');
		activeIndex = intersections[ind].object.index;

		new TWEEN.Tween(intersections[ind].object.position)
			.to(
				{
					x: 0,
					y: 0,
					z: 20,
				},
				Math.random() * 1000 + 1000,
			)
			.easing(TWEEN.Easing.Exponential.InOut)
			.start();
	}
};

// ------------------------------------ Обробка кліків та розширення на повний екран
window.addEventListener('click', handleClick);

/** Базовые обработчики событий длы поддержки ресайза */
window.addEventListener('resize', () => {
	// Обновляем размеры
	sizes.width = window.innerWidth;
	sizes.height = window.innerHeight;

	// Обновляем соотношение сторон камеры
	camera.aspect = sizes.width / sizes.height;
	camera.updateProjectionMatrix();

	// Обновляем renderer
	renderer.setSize(sizes.width, sizes.height);
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	renderer.render(scene, camera);
});

window.addEventListener('dblclick', () => {
	if (!document.fullscreenElement) {
		canvas.requestFullscreen();
	} else {
		document.exitFullscreen();
	}
});
