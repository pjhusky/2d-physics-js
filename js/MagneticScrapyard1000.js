"use strict";

class MagneticScrapyard1000 {
    constructor(app, window, sound_meta_obj) {
        // Adjust the resolution for retina screens; along with
        // the autoDensity this transparently handles high resolutions
        PIXI.settings.RESOLUTION = window.devicePixelRatio || 1;

		this.app = app;			
		
		// Add a handler for the updates
		this.app.ticker.add((delta_frames_of_target_frame_rate) => {
			// console.log( `app.ticker delta = ${delta_frames_of_target_frame_rate}, app.ticker.elapsedMS = ${this.app.ticker.elapsedMS}, app.ticker.deltaTime = ${this.app.ticker.deltaTime}` );
			// console.log( `app.ticker.speed = ${this.app.ticker.speed}, app.ticker.minFPS = ${this.app.ticker.minFPS}` );
			this.update(delta_frames_of_target_frame_rate, this.app.ticker.elapsedMS)
		});

		// this.window_w = window.innerWidth;
		// this.window_h = window.innerHeight;
		
		// Load the menu scene initially; scenes get a reference
		// back to the coordinator so they can trigger transitions
		this.sound_meta_obj = sound_meta_obj;
		//this.gotoScene(new Menu(this))
		this.gotoScene(new GameplayLevel9(this))
    }

    // Replace the current scene with the new one
    async gotoScene(newScene) {
		if (this.currentScene !== undefined) {
			await this.currentScene.onFinish();
			this.app.stage.removeChildren();
		}

		// This is the stage for the new scene
		const container = new PIXI.Container();
		container.position.set(0, 0);
		container.width  = app.screen.width;
		container.height = app.screen.height;
		container.filterArea = app.renderer.screen;
	
		
		// Start the new scene and add it to the stage
		await newScene.onStart(container);
		this.app.stage.addChild(container);
		this.currentScene = newScene;
    }

    // This allows us to pass the PixiJS ticks
    // down to the currently active scene
    update(delta_frames_of_target_frame_rate, dt_in_msec) {
		if (this.currentScene !== undefined) {
			this.currentScene.onUpdate(delta_frames_of_target_frame_rate, dt_in_msec);
		}
    }

    // The dynamic width and height lets us do some smart
    // scaling of the main game content; here we're just
    // using it to maintain a 9:16 aspect ratio and giving
    // our scenes a 375x667 stage to work with

    actualWidth() {
		const { width, height } = this.app.screen;
		const isWidthConstrained = width < height * 9 / 16;
		return isWidthConstrained ? width : height * 9 / 16;
    }

    actualHeight() {
		const { width, height } = this.app.screen;
		const isHeightConstrained = width * 16 / 9 > height;
		return isHeightConstrained ? height : width * 16 / 9;
    }
		
// 	onResize( new_window_w, new_window_h ) {
		
// 		// console.log( `    this.app: ${this.app.screen.width} x ${this.app.screen.height}` );
// 		// console.log( `    this.app.renderer: ${this.app.renderer.screen.width} x ${this.app.renderer.screen.height}` );
		
// 		// this.window_w = new_window_w;
// 		// this.window_h = new_window_h;
// 	}
}