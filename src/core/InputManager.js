export class InputManager {
    constructor() {
        this.keys = {};
        this.mousePos = { x: 0, y: 0 };
        this.mouseButtons = {};

        this.onKeyDown = this.onKeyDown.bind(this);
        this.onKeyUp = this.onKeyUp.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);

        this.setupListeners();

        console.log('🎮 Input manager initialized');
    }

    setupListeners() {
        document.addEventListener('keydown', this.onKeyDown);
        document.addEventListener('keyup', this.onKeyUp);
        document.addEventListener('mousemove', this.onMouseMove);
        document.addEventListener('mousedown', this.onMouseDown);
        document.addEventListener('mouseup', this.onMouseUp);

        // Prevent context menu on right click
        document.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    onKeyDown(e) {
        this.keys[e.code] = true;
    }

    onKeyUp(e) {
        this.keys[e.code] = false;
    }

    onMouseMove(e) {
        this.mousePos.x = e.clientX;
        this.mousePos.y = e.clientY;
    }

    onMouseDown(e) {
        this.mouseButtons[e.button] = true;
    }

    onMouseUp(e) {
        this.mouseButtons[e.button] = false;
    }

    isKeyPressed(code) {
        return !!this.keys[code];
    }

    isMouseButtonPressed(button) {
        return !!this.mouseButtons[button];
    }

    getMovementVector() {
        const movement = { x: 0, z: 0 };

        if (this.isKeyPressed('KeyW') || this.isKeyPressed('ArrowUp')) {
            movement.z -= 1;
        }
        if (this.isKeyPressed('KeyS') || this.isKeyPressed('ArrowDown')) {
            movement.z += 1;
        }
        if (this.isKeyPressed('KeyA') || this.isKeyPressed('ArrowLeft')) {
            movement.x -= 1;
        }
        if (this.isKeyPressed('KeyD') || this.isKeyPressed('ArrowRight')) {
            movement.x += 1;
        }

        // Normalize diagonal movement
        const length = Math.sqrt(movement.x * movement.x + movement.z * movement.z);
        if (length > 0) {
            movement.x /= length;
            movement.z /= length;
        }

        return movement;
    }

    isDashPressed() {
        return this.isKeyPressed('Space') || this.isKeyPressed('ShiftLeft') || this.isKeyPressed('ShiftRight');
    }

    update() {
        // Can be used for input buffering or combo detection
    }

    destroy() {
        document.removeEventListener('keydown', this.onKeyDown);
        document.removeEventListener('keyup', this.onKeyUp);
        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('mousedown', this.onMouseDown);
        document.removeEventListener('mouseup', this.onMouseUp);
    }
}