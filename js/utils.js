// by Alessandra Masur
class TextButtonToggle {
    constructor(text, xPosition, yPosition, objectsToToggle) {
        this.text = text; // text that is written on the button
        this.xPosition = xPosition;
        this.yPosition = yPosition;
        this.objectsToToggle = objectsToToggle; // the Sprites or Graphics to toggle as array
        this.pixiTextObject = this.createButton();
    }

    createButton() {
        // make graphics invisible when starting
        for (let i = 0; i < this.objectsToToggle.length; i += 1) {
            this.objectsToToggle[i].visible = false;
        }
        const textButtonToggle = new PIXI.Text(this.text, textButtonStyle);
        textButtonToggle.x = this.xPosition;
        textButtonToggle.y = this.yPosition;
        textButtonToggle.buttonMode = true;
        textButtonToggle.eventMode = 'dynamic'
        textButtonToggle.on('pointerup', () => {
            this.toggleVisibility();
        });
        return textButtonToggle;
    }

    toggleVisibility() {
        // toggle the visibility of Sprite or Graphic
        for (let i = 0; i < this.objectsToToggle.length; i += 1) {
            this.objectsToToggle[i].visible = !this.objectsToToggle[i].visible;
        }
    }
}

class ChangeSpeedButtons {
    // Buttons to change speed of objects on interpolated paths
    constructor(xPosition, yPosition, speed, speedChange) {
        this.xPosition = xPosition;
        this.yPosition = yPosition;
        this.speed = speed; // duration which will be changed with buttons
        this.speedChange = speedChange; // steps in which to change the duration
        this.pixiTextObjectDuration = this.createInfoButton("Duration:", xPosition, yPosition);
        this.pixiTextObjectFaster = this.createButton("-", this.xPosition+120, yPosition, -this.speedChange);
        this.pixiTextObjectSpeed = this.createInfoButton(this.speed, this.xPosition+150, yPosition);
        this.pixiTextObjectSlower = this.createButton("+", this.xPosition+200, yPosition, this.speedChange);
    }

    createButton(text, xPosition, yPosition, speedChange) {
        const textButton = new PIXI.Text(text, textButtonStyle);
        textButton.x = xPosition;
        textButton.y = yPosition;
        textButton.buttonMode = true;
        textButton.eventMode = 'dynamic'
        textButton.on('pointerup', () => {
            let newSpeed = this.speed + speedChange;
            if (newSpeed >= 0){
                this.changeSpeed(newSpeed);
            }
        });
        return textButton;
    }

    createInfoButton(text, xPosition, yPosition) {
        const speedInfo = new PIXI.Text(text, textButtonStyle);
        speedInfo.x = xPosition;
        speedInfo.y = yPosition;
        return speedInfo;
    }

    changeSpeed(newSpeed) {
        this.speed = newSpeed;
        // update Speed text
        this.pixiTextObjectSpeed.text = newSpeed;
    }
}

class Trajectory{
    // Add trajectory to hierarchical transformation objects
    constructor() {
        this.pointsArray = null;
        this.graphicsObject = this.createTrajectory();
        this.seconds = 3;
    }

    createTrajectory() {
        // draw spline
		let trajectories = new PIXI.Graphics();
		this.pointsArray = [];
        return trajectories;
    }

    addPoint(xPosition, yPosition) {
        
        if (this.pointsArray.length > 400) {
            let removedElement = this.pointsArray.shift();
        }
        this.pointsArray.push({x: xPosition, y: yPosition});
        this.drawTrajectory();
    }

    drawTrajectory() {
        this.graphicsObject.clear();
        this.graphicsObject.lineStyle(1, 0xE8FF00);
        this.graphicsObject.moveTo(this.pointsArray[0].x, this.pointsArray[0].y);
		for (let i = 1; i < this.pointsArray.length; i += 1){
			this.graphicsObject.lineTo(this.pointsArray[i].x, this.pointsArray[i].y);
		}
    }
}