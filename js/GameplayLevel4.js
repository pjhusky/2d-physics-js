"use strict";

//import { MathUtil } from './mathUtil.js';

//export
class GameplayLevel4 {

	
	// static random() {
	// 	let x = Math.sin(seed++) * 10000;
	// 	return x - Math.floor(x);
	// }            

	//static random = this.mulberry32();
	
	// WORKS
	//static random = MathUtil.DeterministicRandom.mulberry32;
	
	static random = MathUtil.DeterministicRandom2().mulberry32;

	// WORKS
	// static random() { 
	// 	return MathUtil.DeterministicRandom.mulberry32();
	// }

	// WORKS
	// static random() { 
	// 	return MathUtil.DeterministicRandom2().mulberry32();
	// }

	
	constructor(coordinator) {
		// add gameobjects to constructor if they are needed in update method
		this.app = coordinator.app;
		this.coordinator = coordinator;
		this.prevPhysicsUpdateTime = Date.now();
		this.physicsWorker;
		this.elapsed_target_frame_rate_frames = 0.0;
		this.accum_elapsed_msec = 0.0;
		this.simulation_time_left_to_consume_msec = 0.0;
		this.fixed_simulation_dt_msec = 1000.0 / 60.0; // target 60Hz for simulation
		this.min_simulation_frame_rate = 30.0;
		this.max_simulation_dt_in_sec = 1.0 / this.min_simulation_frame_rate;
		this.max_simulation_advance_steps = 5;

		this.curr_window_w = 0;
		this.curr_window_h = 0;
		
		
		
		this.sceneMapTex = undefined;
		this.sceneMapTexSprite = undefined;
		this.texRT = undefined;
		
		this.recording = false; // set to true to create a new particle-color capture
		if ( this.recording ) {
			this.sceneMapTex = PIXI.Texture.from('../assets/SimAnim_Logo_Atomic.png'); // Atomic LOGO when recording
			// this.sceneMapTex = PIXI.Texture.from('../assets/SimAnim_Logo_PCB.png'); // PCB LOGO when recording
			
			this.sceneMapTexSprite = PIXI.Sprite.from(this.sceneMapTex);
		} else {
			this.sceneMapTex = PIXI.Texture.from('../assets/screenRatio_whiteOnly.png'); // playback
		}
				

		this.maxNumFluidParticles = 7200.0;
		this.fluidParticleRadius = 5.35;
		
		this.useCircleOutline = true;

		this.sim_grid_dim = {w:1024.0, h:1024.0};
		
		this.fluidParticleGravityX = 0.0;
		this.fluidParticleGravityY = 1200.0;
		
		
		this.fluidSolverCircleAreaConstraint;
		this.particleFluidSolver;
		this.outlinedCircleRT = null;
		
		this.activeFluidParticles;
		this.circleShapesContainer;
		
		this.fixedDt = 0.016;
		//this.subSteps = 4;
		this.subSteps = 6;
		
		this.constraint_remove_start_delay_ticks = 90;
		this.back_to_menu_delay_ticks = 180;
		
		this.gfx_utils = new GfxUtils( this.app );
	}


	initPictureParticles() {
		
		// let browserEnum = new AppUtils.BrowserEnum();
		// let fluidParticleTints = null;
		// if ( browserEnum.isFirefox ) {
		// 	//!!! fluidParticleTints = MyParticleColorsFirefox.tints;
		// 	fluidParticleTints = MyParticleColorsChrome.tints;
		// 	console.log( "use Firefox browser color tints" );
		// } else {
		// 	fluidParticleTints = MyParticleColorsChrome.tints;
		// 	console.log( "use Chrome browser color tints" );
		// }

		let fluidParticleTints = (Math.random() < 0.5) ? ParticleColorsPcb.tints : ParticleColorsAtomic.tints;
		
		// if ( useStickyGooLook ) {
		// 	maxNumFluidParticles = 1900.0;
		// 	fluidParticleRadius = 6.0;
		// }
					
		console.log( `this.app.screen.width = ${this.app.screen.width}` );
		console.log( `this.app.screen.height = ${this.app.screen.height}` );
		
		
		{
			const radius = Math.min( this.sim_grid_dim.w, this.sim_grid_dim.h ) * 0.46;
			const center_x = this.sim_grid_dim.w * 0.5; 
			const center_y = this.sim_grid_dim.h * 0.5;
			this.fluidSolverCircleAreaConstraint = new ParticleBoundaryConstraintCircle( center_x, center_y, radius, this.fluidParticleRadius );
		}
		
		//this.particleFluidSolver = new ParticleFluidSolver.FluidSolver( this.app.screen.width, this.app.screen.height, 
		this.particleFluidSolver = new ParticleFluidSolver.FluidSolver( this.sim_grid_dim.w, this.sim_grid_dim.h, 
														this.maxNumFluidParticles, this.fluidParticleRadius, this.fluidParticleGravityX, this.fluidParticleGravityY,
														this.fixedDt, this.subSteps,
														[ this.fluidSolverCircleAreaConstraint ] );
					
		
		
		
		//if ( !fluidAsBlobs ) 
		{
			this.outlinedCircleRT = this.gfx_utils.getCircleRenderTexture( this.fluidParticleRadius, this.useCircleOutline );
		}
		
		//if ( !fluidAsBlobs ) 
		// { // TODO: remove this check and perform always?
		// 	let readImg = PIXI.Sprite.from(sceneMapTex);
		// 	let image = this.app.renderer.extract.pixels(readImg);
			
		// 	let wfm = async (image) => {
		// 		await image;
		// 	}
		// 	wfm(image);
		// }
		

		//let activeFluidParticles = 0;
		this.activeFluidParticles = 0;
		for (let i = 0; i < this.maxNumFluidParticles; i++) {
			let fluidParticle = null;
			// DEBUG: comment this back in!!!
			// if ( fluidAsBlobs ) {
			// 	fluidParticle = new ParticleFluidSolver.FluidParticle(gaussTexture);
			// 	fluidParticle.scale.set( 0.2 );
			// 	fluidParticle.blendMode = PIXI.BLEND_MODES.ADD;
				
			// 	if ( useStickyGooLook ) {
			// 		fluidParticle.tint = parseInt(Math.floor(GameplayLevel4.random() * 16777215).toString(16), 16); // that STICKY gooey look :-)
			// 	} else {
			// 		fluidParticle.tint = AppUtils.rgbToHex( 255, 255, 255 ); // CLEAN LOOK!!!
			// 	}
				
			// } else {
				fluidParticle = new ParticleFluidSolver.FluidParticle(this.outlinedCircleRT);
				fluidParticle.blendMode = PIXI.BLEND_MODES.NORMAL;
				
				let addr = i;
				if ( addr < fluidParticleTints.length ) {
					fluidParticle.tint = fluidParticleTints[addr];
					//console.log("here!");
				} else {
					fluidParticle.tint = parseInt(Math.floor(GameplayLevel4.random() * 16777215).toString(16), 16);
					//console.log(`here! i=${i}, len=${fluidParticleTints.length}`);
				}
			// }

			//fluidParticle.anchor.set(0.5);
			
			fluidParticle.position.x = this.sim_grid_dim.w * ( 0.33 + GameplayLevel4.random()*0.33 );
			fluidParticle.position.y = this.sim_grid_dim.h * ( 0.33 + GameplayLevel4.random()*0.33 );

			fluidParticle.speed = 1 + GameplayLevel4.random() * 1.2;
			fluidParticle.lastPosX = fluidParticle.position.x;
			fluidParticle.lastPosY = fluidParticle.position.y; 

			fluidParticle.accelX = 0.0;
			fluidParticle.accelY = this.fluidParticleGravityY;
			
			this.particleFluidSolver.addParticle( fluidParticle );
		}

		this.particleFluidSolver.setActiveParticleCount( 0 );

		this.circleShapesContainer = new PIXI.Container();

		// this.circleShapesContainer.scale.x = 0.5;
		// this.circleShapesContainer.scale.y = 1.0;
		this.circleShapesContainer.scale.set( 1.0, 1.0 );
		
		this.circleShapesContainer.width = this.sim_grid_dim.w;
		this.circleShapesContainer.height = this.sim_grid_dim.h;

		this.keyObject_esc;
	}	
	
  	onStart(container) {

		this.keyObject_esc = AppUtils.keyboard( "Escape" ); 
		this.keyObject_esc.release = async () => {
			this.coordinator.gotoScene(new Menu(this.coordinator));	
		};
		
    	// Add this to all levels ----------------
		
		// Level 4 info text
		const levelInfo = new PIXI.Text('Level 3', levelInfoStyle);
		levelInfo.x = 20;
		levelInfo.y = 20;
		container.addChild(levelInfo);

		// Button to go back to menu screen
		this.exitText = new PIXI.Text('Back to menu (ESC)', exitStyle);
		this.exitText.x = 0.5 * this.app.screen.width;
		this.exitText.y = 20.0;
		this.exitText.pivot.x = 0.5 * this.exitText.width;
		// These options make the text clickable
		this.exitText.buttonMode = true;
		this.exitText.eventMode = 'dynamic';
		// Go to the menu scene when clicked
		this.exitText.on('pointerup', () => {
			this.coordinator.gotoScene(new Menu(this.coordinator));
		});
		container.addChild(this.exitText);
		
		// ---------------------------------------

		// build level


		this.initPictureParticles();
		//container.addChild(this.circleShapesContainer);

		if ( false ) { // just testing screen coordinates
			{
				let fluidParticle = new ParticleFluidSolver.FluidParticle(this.outlinedCircleRT);		
				fluidParticle.position.set( this.app.screen.width / 2, this.app.screen.height / 2 );
				//fluidParticle.scale.set( 2.0, 2.0 );
				container.addChild(fluidParticle);
			}

			{
				const scale = 2.0;
				let fluidParticle = new ParticleFluidSolver.FluidParticle(this.outlinedCircleRT);		
				fluidParticle.position.set( scale * this.fluidParticleRadius, this.app.screen.height / 2 );
				fluidParticle.tint = 0xAA4444;
				fluidParticle.scale.set( scale, scale );
				container.addChild(fluidParticle);
			}

			{
				const scale = 1.0
				let fluidParticle = new ParticleFluidSolver.FluidParticle(this.outlinedCircleRT);		
				fluidParticle.position.set( this.app.screen.width - scale * this.fluidParticleRadius, this.app.screen.height / 2 );
				fluidParticle.tint = 0x4444AA;
				fluidParticle.scale.set( scale, scale );
				container.addChild(fluidParticle);
			}			
		}
		
		

		if ( this.recording ) {
			this.app.stage.filterArea = this.app.renderer.screen;
		
			const passThroughFilter = new PIXI.Filter( PIXI.Filter.defaultVertexSrc,  PIXI.Filter.defaultFragmentSrc, { myUniform: 0.5 } );
			this.app.stage.filters = [passThroughFilter];

			container.addChild( this.sceneMapTexSprite );			
		}
		
		container.addChild(this.circleShapesContainer);

		if ( this.recording ) {
			let keyObject_SPACE = AppUtils.keyboard( " " );            
			
			keyObject_SPACE.press = () => {
				//key object pressed
			};
			keyObject_SPACE.release = async () => {
				//key object released

				//const image = await this.app.renderer.extract.pixels(this.sceneMapTexSprite);
				const image = await this.app.renderer.extract.pixels(this.texRT); // Chrome!
				
				let browserEnum = new AppUtils.BrowserEnum();
				ParticleFluidSolver.saveFluidParticleColors(
					this.app,
					browserEnum,
					this.particleFluidSolver.getFluidParticles(), 
					image, 
					this.sceneMapTex, 
					{w: this.app.screen.width, h: this.app.screen.height} );
			};
		}		
		
		// TODO: not using threads yet
		// run physics web worker
		//!!! this.startWebWorker();
  	}

	
	onResize() {
		console.log( `got resize event` );
	}
	
	pollResize() {
		if (this.curr_window_w != this.app.screen.width ||
			this.curr_window_h != this.app.screen.height) {

			this.exitText.x = 0.5 * this.app.screen.width;

			const scr_dim = { w: this.app.screen.width, h: this.app.screen.height };
			const aspect_ratio = scr_dim.w / scr_dim.h;

			let container_scale = { x: scr_dim.w / this.sim_grid_dim.w, y: scr_dim.h / this.sim_grid_dim.h };

			console.log(`screen dim ${scr_dim.w} | ${scr_dim.h}`);
			if (scr_dim.w >= scr_dim.h) {
				container_scale.x *= 1.0 / aspect_ratio;
			} else {
				container_scale.y *= aspect_ratio;
			}

			this.circleShapesContainer.scale = container_scale;

			this.circleShapesContainer.position.set(scr_dim.w * 0.5, scr_dim.h * 0.5);
			this.circleShapesContainer.pivot.set(0.5 * this.sim_grid_dim.w, 0.5 * this.sim_grid_dim.h);

			this.curr_window_w = this.app.screen.width;
			this.curr_window_h = this.app.screen.height;
		}
	}
	
	
	onUpdate(delta_frames_of_target_frame_rate, dt_in_msec) {
		this.elapsed_target_frame_rate_frames += delta_frames_of_target_frame_rate;
		this.accum_elapsed_msec += dt_in_msec;
		
		const simulation_time_step_mode = 0; // frame-rate dependent fixed dt; => correct image, but not frame-rate independent
		//const simulation_time_step_mode = 1; // use_varying_dt_step;
		//const simulation_time_step_mode = 2; // fixed_dt_frame_rate_independent_step => correct image, but very stuttery
		
		if ( simulation_time_step_mode == 0 ) {
			this.stepSimulation( this.fixed_simulation_dt_msec * 0.001 ); // advance sim time by desired fixed dt
		} else if ( simulation_time_step_mode == 1 ) {
			let clamped_dt_in_sec = dt_in_msec * 0.001;
			clamped_dt_in_sec = Math.min( clamped_dt_in_sec, this.max_simulation_dt_in_sec );
			this.stepSimulation( clamped_dt_in_sec ); // advance sim time by actual (varing) dt
		} else if ( simulation_time_step_mode == 2 ) {
			this.simulation_time_left_to_consume_msec += dt_in_msec; 
			// consume sim time we have left to consume in chunks of the fixed dt time step
			let max_steps = this.max_simulation_advance_steps;
			while( this.simulation_time_left_to_consume_msec >= this.fixed_simulation_dt_msec && max_steps-- > 0 ) {
				this.stepSimulation( this.fixed_simulation_dt_msec * 0.001 ); // advance sim time by fixed dt
				this.simulation_time_left_to_consume_msec -= this.fixed_simulation_dt_msec;
			}
		}
				
		// let particles fall freely once they have all been spawned (after small delay)
		if (this.activeFluidParticles >= this.maxNumFluidParticles ) {
			if ( this.constraint_remove_start_delay_ticks > 0 ) {
				this.constraint_remove_start_delay_ticks--;
				if ( this.constraint_remove_start_delay_ticks <= 0 ) {
					this.particleFluidSolver.constraints = [];	
				}
			} else {
				this.back_to_menu_delay_ticks--;
				if ( this.back_to_menu_delay_ticks <= 0 ) {
					this.coordinator.gotoScene(new Menu(this.coordinator));
				}
			}
		}		
		
		this.pollResize();
	}
	

	stepSimulation(dt_in_sec) {	
		this.updatePictureParticles(dt_in_sec);
	}
	

	updatePictureParticles( dt_in_sec ) {
		
		// console.log( `this.app.screen.width = ${this.app.screen.width}` );
		// console.log( `this.app.screen.height = ${this.app.screen.height}` );
		
		// emit new fluid particles    
		//const emissionRate = (isPictureParticleFluidDemoMode) ? 8 : 6;
		const emissionRate = 8;
		//const emissionRate = 1;
		for (let i = 0; i < emissionRate; i++) {
			const angleVal = dt_in_sec * 2.0 * 3.1415;
			const cosTime = Math.cos(angleVal) * 0.3 + 0.7;
			const sinTime = Math.sin(angleVal) * 0.3 + 0.7;

			//if ( activeFluidParticles < fluidParticles.length ) {
			if (this.activeFluidParticles < this.maxNumFluidParticles) {
				//let fluidParticle = fluidParticles[activeFluidParticles];
				//XXXYYYXXX let fluidParticle = particleFluidSolver.addNewParticleAtIdx( activeFluidParticles );
				let fluidParticle = this.particleFluidSolver.getParticleAtIdx(this.activeFluidParticles);

				//if ( isPictureParticleFluidDemoMode ) 
				{
					let offX = this.activeFluidParticles % 13 - 6;
					offX *= 1.8 + 0.2 * GameplayLevel4.random();

					//fluidParticle.position.x = this.app.screen.width * 0.375 + offX * 1.25 * this.fluidParticleRadius;
					fluidParticle.position.x = this.sim_grid_dim.w * 0.375 + offX * 1.25 * this.fluidParticleRadius;

					let offY = this.activeFluidParticles % 10;
					offY *= 0.8 + 0.2 * GameplayLevel4.random();
					let signX = -1.0;
					let randDir = -GameplayLevel4.random() * 0.4 + 0.6;
					const randDirX_tmp = randDir * signX * 0.8 * this.fluidParticleRadius;
					const randDirY_tmp = 0.2; 

					let randDirX = +cosTime * randDirX_tmp + sinTime * randDirY_tmp;
					let randDirY = -sinTime * randDirX_tmp + cosTime * randDirY_tmp;

					fluidParticle.position.y = this.sim_grid_dim.h * 0.225 + offY * this.fluidParticleRadius;

					fluidParticle.position.x += randDirX * 2.0;
					fluidParticle.position.y += randDirY * 2.0;

					fluidParticle.lastPosX = fluidParticle.position.x + randDirX;
					fluidParticle.lastPosY = fluidParticle.position.y + randDirY; // + randDir * 0.5 * fluidParticleRadius; 

				}
				// else /*if ( isMetaballFluidDemoMode )*/ {
				// 	// let signX = ( activeFluidParticles % 3 ) - 1;
				// 	// randDir = GameplayLevel4.random() * 0.5 - 0.25;
				// 	// randDirX = randDir * 0.03 * signX;
				// 	// randDirY = randDir * 0.02;
				// 	// fluidParticle.position.x = app.screen.width * 0.5 + offX * fluidParticleRadius;
				// 	// fluidParticle.position.y = app.screen.height * 0.25 + offY * fluidParticleRadius;
				// 	let offX = activeFluidParticles % 13 - 6;
				// 	fluidParticle.position.x = app.screen.width / 2 + offX * 1.8 * fluidParticleRadius;
				// 	let offY = activeFluidParticles % 10;
				// 	let signX = ( activeFluidParticles % 3 ) - 1;
				// 	let randDir = GameplayLevel4.random() * 0.5 - 0.25;
				// 	fluidParticle.speed = 0.0001;
				// 	fluidParticle.position.y = app.screen.height / 4 + offY * 1.8 * fluidParticleRadius;
				// 	fluidParticle.lastPosX = fluidParticle.position.x + dt * randDir * signX * 0.5 * fluidParticleRadius;
				// 	fluidParticle.lastPosY = fluidParticle.position.y + dt * randDir * 0.5 * fluidParticleRadius; 
				// }
				fluidParticle.accelX = 0.0;
				fluidParticle.accelY = this.fluidParticleGravityY;

				// if ( fluidAsBlobs ) {
				// 	metaballContainer.addChild(fluidParticle);
				// } else {
				this.circleShapesContainer.addChild(fluidParticle);
				// }
				this.activeFluidParticles++;
				this.particleFluidSolver.setActiveParticleCount(this.activeFluidParticles);
			} else {
				break;
			}
		}
		
		
		this.particleFluidSolver.updateFluidDriver( dt_in_sec );

		
		if ( this.recording ) { // weird, but have to run this all the time in firefox for capture to work
			const width = this.sceneMapTex.width;
			const height = this.sceneMapTex.height;

			this.sceneMapTexSprite.width  = width;
			this.sceneMapTexSprite.height = height;
			this.sceneMapTexSprite.anchor.set( 0.5 );
				
			// Draw the circle to the RenderTexture
			//if ( this.texRT == undefined ) {
				this.texRT = PIXI.RenderTexture.create({
					width,
					height,
					//multisample: MSAA_QUALITY.HIGH,
					resolution: 1 //window.devicePixelRatio
				});
			//}
						
			// With the existing renderer, render texture
			// make sure to apply a transform Matrix
			this.app.renderer.render(this.sceneMapTexSprite, {
				renderTexture: this.texRT,
				transform: new PIXI.Matrix(1, 0, 0, 1, width / 2, height / 2)
			});
			
			// Required for MSAA, WebGL 2 only
			//this.app.renderer.framebuffer.blit();
			
			this.sceneMapTexSprite.width = this.app.screen.width;
			this.sceneMapTexSprite.height = this.app.screen.height;
			this.sceneMapTexSprite.anchor.set( 0.0 );
				
		}
				
	}	

  	onFinish() {
		this.keyObject_esc.unsubscribe();
		return;
		
		this.physicsWorker.terminate();
		console.log("Terminated web worker")
	}

	startWebWorker() {
		return;
		
		// run physics web worker
		this.physicsWorker = new Worker('../js/WorkerLevel4.js');
		// send message to worker to start it
		this.physicsWorker.postMessage({
			update: true,
			goblin: [this.goblinCurve.splineValues, this.changeSpeedButtons.speed, true, true, true],
			daemon: [this.daemonCurve.splineValues, this.changeSpeedButtons.speed, true, true, true]
		});
	}
}
