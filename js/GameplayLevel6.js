"use strict";

//import { MathUtil } from './mathUtil.js';

//export
class GameplayLevel6 {

	static random = MathUtil.DeterministicRandom2().mulberry32;
	
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
		
		//this.sceneMapTex = undefined;
		//this.sceneMapTex = PIXI.Texture.from('../assets/screenRatio_whiteOnly.png'); // ???
		this.sceneMapTex = PIXI.Texture.from("../assets/mark-komorowski-90-scaled.jpg"); // ???
		
		
		this.sceneMapTexSprite = undefined;
		
				
		this.maxNumFluidParticles = 2200.0;
		this.fluidParticleRadius = 9.4;
		
		this.useCircleOutline = true;

		this.sim_grid_dim = {w:1024.0, h:1024.0};
		
		this.fluidParticleGravityX = 0.0;
		this.fluidParticleGravityY = 1200.0;
		
		
		this.fluidSolverCircleAreaConstraint;
		this.particleFluidSolver;
		this.outlinedCircleRT = null;
		
		this.activeFluidParticles;

		
		this.fixedDt = 0.016;
		//this.subSteps = 4;
		this.subSteps = 6;
		
		this.constraint_remove_start_delay_ticks = 180;
		this.back_to_menu_delay_ticks = 260;

		this.drawMetaballs = true;
		this.drawBackgroundMetaballs = true;
		
		this.useStickyGooLook = false;
		
		let gaussDim = 256;
		let gaussSpriteScale = 96.0 / gaussDim;
		let gaussianDeviation = 0.2;
		this.gaussianHeight = 0.3;
		let [gaussContainer, gaussQuad, gaussTexture] = MyGauss.setupGauss( gaussDim, gaussianDeviation, this.gaussianHeight );
		this.gaussTexture = gaussTexture;

		
	}	

	initMetaballParticles() {

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
					
		
		
		

		this.activeFluidParticles = 0;
		for (let i = 0; i < this.maxNumFluidParticles; i++) {
			let fluidParticle = null;
			
			//if ( fluidAsBlobs ) 
			{
				fluidParticle = new ParticleFluidSolver.FluidParticle(this.gaussTexture);
				fluidParticle.scale.set( 0.1 + Math.random() * 0.3 );
				fluidParticle.blendMode = PIXI.BLEND_MODES.ADD;
				
				if ( this.useStickyGooLook ) {
					//fluidParticle.tint = parseInt(Math.floor(GameplayLevel6.random() * 16777215).toString(16), 16); // that STICKY gooey look :-)
					fluidParticle.tint = AppUtils.rgbToHex( GameplayLevel6.random() * 191 + 64, GameplayLevel6.random() * 191 + 64, GameplayLevel6.random() * 191 + 64 );
				} else {
					fluidParticle.tint = AppUtils.rgbToHex( 255, 255, 255 ); // CLEAN LOOK!!!
				}
				
			} 
			fluidParticle.anchor.set(0.5);
			
			fluidParticle.position.x = this.sim_grid_dim.w * ( 0.33 + GameplayLevel6.random()*0.33 );
			fluidParticle.position.y = this.sim_grid_dim.h * ( 0.33 + GameplayLevel6.random()*0.33 );
			fluidParticle.speed = 1 + GameplayLevel6.random() * 1.2;
			fluidParticle.lastPosX = fluidParticle.position.x;
			fluidParticle.lastPosY = fluidParticle.position.y; 

			fluidParticle.accelX = 0.0;
			fluidParticle.accelY = this.fluidParticleGravityY;
			
			this.particleFluidSolver.addParticle( fluidParticle );
		}

		this.particleFluidSolver.setActiveParticleCount( 0 );

		this.metaballContainer = new PIXI.Container();

		this.metaballContainer.scale.set( 1.0, 1.0 );
		
		this.metaballContainer.width = this.sim_grid_dim.w;
		this.metaballContainer.height = this.sim_grid_dim.h;

		this.keyObject_esc;
	}	
	
  	onStart(container) {
		
		this.keyObject_esc = AppUtils.keyboard( "Escape" ); 
		this.keyObject_esc.release = async () => {
			this.coordinator.gotoScene(new Menu(this.coordinator));	
		};
		
    	// Add this to all levels ----------------
		
		// Level 6 info text
		const levelInfo = new PIXI.Text('Level 5', levelInfoStyle);
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

		

		this.initMetaballParticles();

		
		
		// this.metaballContainer = new PIXI.Container();
		// this.metaballContainer.position.set(0, 0);
		// this.metaballContainer.width  = this.app.screen.width;
		// this.metaballContainer.height = this.app.screen.height;
		this.metaballContainer.filterArea = this.app.renderer.screen;
		
		this.maxGaussAccum = this.gaussianHeight * 50;

		if ( this.drawMetaballs ) {
			container.addChild(this.metaballContainer);
		}

		//this.envMapTex = PIXI.Texture.from('../assets/spheremap-mountains.jpg');
		//this.envMapTex = PIXI.Texture.from('../assets/water-refl.jpg');
		//this.envMapTex = PIXI.Texture.from("../assets/mark-komorowski-90-scaled.jpg"); // ???
		this.envMapTex = ( Math.random() < 0.5 ) ? PIXI.Texture.from("../assets/mark-komorowski-90-scaled.jpg") : PIXI.Texture.from('../assets/spheremap-mountains.jpg');
		
		
		this.metaballNormalsFilter = new PIXI.Filter( 
			FilterShaders.myVertexSrc,
			FilterShaders.metaballNormalsFilterFragmentSrc, 
			{   u_envMapTex: this.envMapTex, 
				u_sceneMapTex: this.sceneMapTex, 
				u_recipMaxGaussAccum: 1.0/this.maxGaussAccum, 
				u_rDim: {x: 1.0/this.app.renderer.screen.width, y: 1.0/this.app.renderer.screen.height} } 
		);
	
		//container.filters = [this.metaballNormalsFilter];
		this.metaballContainer.filters = [this.metaballNormalsFilter];
		
			
			
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

			this.metaballContainer.scale = container_scale;

			this.metaballContainer.position.set(scr_dim.w * 0.5, scr_dim.h * 0.5);
			this.metaballContainer.pivot.set(0.5 * this.sim_grid_dim.w, 0.5 * this.sim_grid_dim.h);

			this.curr_window_w = this.app.screen.width;
			this.curr_window_h = this.app.screen.height;
		}
	}
	
	
	onUpdate(delta_frames_of_target_frame_rate, dt_in_msec) {
		this.elapsed_target_frame_rate_frames += delta_frames_of_target_frame_rate;
		this.accum_elapsed_msec += dt_in_msec;
		
		//const simulation_time_step_mode = 0; // frame-rate dependent fixed dt; => correct image, but not frame-rate independent
		const simulation_time_step_mode = 1; // use_varying_dt_step; => not a problem in this level, as 100% determinism isn't needed 
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
					
					// apply upward impulse
					for ( let i = 0; i < this.maxNumFluidParticles; i++ ) {
						let fluidParticle = this.particleFluidSolver.getParticleAtIdx(i);
						fluidParticle.accelerate( 20.0 * Math.random() * ( fluidParticle.position.x - this.sim_grid_dim.w * 0.5 ), -3800.0 - Math.random() * 6200.0 );
						fluidParticle.updatePosition( dt_in_msec * 0.001 );
					}
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
		
		this.metaballNormalsFilter.uniforms.u_time = this.elapsed_target_frame_rate_frames;
		this.metaballNormalsFilter.uniforms.u_rDim = {x: 1.0/this.app.renderer.screen.width, y: 1.0/this.app.renderer.screen.height};
		this.metaballNormalsFilter.uniforms.u_dim = {x: this.app.renderer.screen.width, y: this.app.renderer.screen.height};
		
		
		this.updateMetaballParticles(dt_in_sec);
	}
	
	updateMetaballParticles( dt_in_sec ) {
		
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

				let fluidParticle = this.particleFluidSolver.getParticleAtIdx(this.activeFluidParticles);

				// {
				// 	let offX = this.activeFluidParticles % 13 - 6;
				// 	offX *= 1.8 + 0.2 * GameplayLevel5.random();

				// 	//fluidParticle.position.x = this.app.screen.width * 0.375 + offX * 1.25 * this.fluidParticleRadius;
				// 	fluidParticle.position.x = this.sim_grid_dim.w * 0.375 + offX * 1.25 * this.fluidParticleRadius;

				// 	let offY = this.activeFluidParticles % 10;
				// 	offY *= 0.8 + 0.2 * GameplayLevel5.random();
				// 	let signX = -1.0;
				// 	let randDir = -GameplayLevel5.random() * 0.4 + 0.6;
				// 	const randDirX_tmp = randDir * signX * 0.8 * this.fluidParticleRadius;
				// 	const randDirY_tmp = 0.2; 

				// 	let randDirX = +cosTime * randDirX_tmp + sinTime * randDirY_tmp;
				// 	let randDirY = -sinTime * randDirX_tmp + cosTime * randDirY_tmp;

				// 	fluidParticle.position.y = this.sim_grid_dim.h * 0.225 + offY * this.fluidParticleRadius;

				// 	fluidParticle.position.x += randDirX * 2.0;
				// 	fluidParticle.position.y += randDirY * 2.0;

				// 	fluidParticle.lastPosX = fluidParticle.position.x + randDirX;
				// 	fluidParticle.lastPosY = fluidParticle.position.y + randDirY; // + randDir * 0.5 * fluidParticleRadius; 
				// }
				
				{
					let offX = this.activeFluidParticles % 13 - 6;
					fluidParticle.position.x = this.sim_grid_dim.w * 0.5 + offX * 1.8 * this.fluidParticleRadius;
					let offY = this.activeFluidParticles % 10;
					let signX = ( this.activeFluidParticles % 3 ) - 1;
					let randDir = GameplayLevel6.random() * 0.5 - 0.25;
					fluidParticle.speed = 0.0001;
					fluidParticle.position.y = this.sim_grid_dim.h * 0.25 + offY * 1.8 * this.fluidParticleRadius;
					fluidParticle.lastPosX = fluidParticle.position.x + dt_in_sec * randDir * signX * 0.5 * this.fluidParticleRadius;
					fluidParticle.lastPosY = fluidParticle.position.y + dt_in_sec * randDir * 0.5 * this.fluidParticleRadius; 
				}


				fluidParticle.accelX = 0.0;
				fluidParticle.accelY = this.fluidParticleGravityY;

				// if ( fluidAsBlobs ) {
				 	this.metaballContainer.addChild(fluidParticle);
				// } else {
				// this.metaballContainer.addChild(fluidParticle);
				// }
				this.activeFluidParticles++;
				this.particleFluidSolver.setActiveParticleCount(this.activeFluidParticles);
			} else {
				break;
			}
		}
				
		this.particleFluidSolver.updateFluidDriver( dt_in_sec );
		
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
		this.physicsWorker = new Worker('../js/WorkerLevel6.js');
		// send message to worker to start it
		this.physicsWorker.postMessage({
			update: true,
			goblin: [this.goblinCurve.splineValues, this.changeSpeedButtons.speed, true, true, true],
			daemon: [this.daemonCurve.splineValues, this.changeSpeedButtons.speed, true, true, true]
		});
	}
}
