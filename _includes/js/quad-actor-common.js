var cellGeometry = cellGeometry || new THREE.BoxGeometry( 1, 1, .01 );
var zeroMaterial = zeroMaterial || new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true });
var nonzeroMaterial = nonzeroMaterial || new THREE.MeshBasicMaterial({ color: 0x000000 });
var diagMaterial = diagMaterial || new THREE.MeshBasicMaterial({ color: 0xff0000 });
var testMaterial = testMaterial || new THREE.MeshBasicMaterial({ color: 0x0044ff });
var ptrMaterial = ptrMaterial || new THREE.MeshBasicMaterial({ color: 0x777777 });
var curveMaterial = curveMaterial || new THREE.LineBasicMaterial({ color: 0x777777 });
