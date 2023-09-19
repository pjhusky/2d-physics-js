// by Alessandra Masur
class Menu {

	constructor(coordinator) {
		this.app = coordinator.app;
		this.coordinator = coordinator;
		this.robot = null;
		this.elapsed_target_frame_rate_frames = 0.0;
		this.accum_elapsed_msec = 0.0;
		this.simulation_time_left_to_consume_msec = 0.0;
		this.fixed_simulation_dt_msec = 1000.0 / 60.0; // target 60Hz for simulation
		this.min_simulation_frame_rate = 30.0;
		this.max_simulation_dt_in_sec = 1.0 / this.min_simulation_frame_rate;
		this.max_simulation_advance_steps = 5;
		
		this.drawMetaballs = true;
		this.drawBackgroundMetaballs = true;
	}

	onStart(container) {

		// BG image
		const sceneMapTex = PIXI.Texture.from("../assets/mark-komorowski-90-scaled.jpg");

		this.curr_window_w = 0;
		this.curr_window_h = 0;
		
		// based on https://www.shadertoy.com/view/Ms23DR#
		this.crtFilter = new PIXI.Filter(
			FilterShaders.myVertexSrc,
			FilterShaders.crtFilterFragmentSrc,
			{ 
				u_time: 0.0, 
				u_rDim: {x: 1.0/this.app.renderer.screen.width, y: 1.0/this.app.renderer.screen.height}, 
				u_dim: {x: this.app.renderer.screen.width, y: this.app.renderer.screen.height},
				u_boostDistortIntensity: 0.9,
				u_baseEmit: 0.1 
			}
		);
		//this.app.stage.filters = [ this.crtFilter ];
		
		// blobs in the background
		let gaussDim = 256;
		let gaussSpriteScale = 96.0 / gaussDim;
		let gaussianDeviation = 0.2;
		let gaussianHeight = 0.3;
		let [gaussContainer, gaussQuad, gaussTexture] = MyGauss.setupGauss( gaussDim, gaussianDeviation, gaussianHeight );

		this.metaballContainer = new PIXI.Container();
		this.metaballContainer.position.set(0, 0);
		this.metaballContainer.width  = this.app.screen.width;
		this.metaballContainer.height = this.app.screen.height;
		this.metaballContainer.filterArea = this.app.renderer.screen;

		let numGaussSprites = 70;

		if ( this.drawMetaballs ) {
			container.addChild(this.metaballContainer);
		}

		this.gaussSpriteArray = [];
            
		for (let i = 0; i < numGaussSprites; i++) {
			const gaussSprite = new PIXI.Sprite(gaussTexture);
			gaussSprite.blendMode = PIXI.BLEND_MODES.ADD;
			gaussSprite.anchor.set(0.5);
			// set a random scale
			const rand_scale = 1.8 * gaussSpriteScale + Math.random() * 0.3;
			gaussSprite.scale.set( rand_scale );
			// gaussSprite.width  = rand_scale;
			// gaussSprite.height = rand_scale;

			//gaussSprite.tint = parseInt(Math.floor(Math.random() * 16777215).toString(16), 16); // that STICKY gooey look :-)
			
			// finally let's set a random position...
			gaussSprite.x = Math.floor(Math.random() * this.app.screen.width);
			gaussSprite.y = Math.floor(Math.random() * this.app.screen.height);
			// create some extra properties that will control movement
			gaussSprite.direction = Math.random() * Math.PI * 2;
			// this number will be used to modify the direction of the dude over time
			gaussSprite.turningSpeed = Math.random() - 0.8;
			// create a random speed between 0 - 2
			gaussSprite.speed = 2 + Math.random() * 2;
			// finally we push the dude into the dudeArray so it it can be easily accessed later
			this.gaussSpriteArray.push(gaussSprite);
			gaussSprite.cullable = false;
			
			if ( this.drawBackgroundMetaballs ) {
				this.metaballContainer.addChild(gaussSprite);
			}
		}   

		const maxGaussAccum = gaussianHeight * 12;//numGaussSprites;
            
		this.gaussSpriteBoundsPadding = 40.0;
		this.gaussSpriteBounds = new PIXI.Rectangle(
			-this.gaussSpriteBoundsPadding,
			-this.gaussSpriteBoundsPadding,
			this.app.screen.width  + this.gaussSpriteBoundsPadding + 100.0,
			this.app.screen.height + this.gaussSpriteBoundsPadding + 100.0,
		);                    
	
		const envMapTex = PIXI.Texture.from('../assets/spheremap-mountains.jpg');
		//const envMapTex = PIXI.Texture.from('../assets/water-refl.jpg');
		
		this.metaballNormalsFilter = new PIXI.Filter( 
			FilterShaders.myVertexSrc,
			FilterShaders.metaballNormalsFilterFragmentSrc, 
			{   u_envMapTex: envMapTex, 
				u_sceneMapTex: sceneMapTex, 
				u_recipMaxGaussAccum: 1.0/maxGaussAccum, 
				u_rDim: {x: 1.0/this.app.renderer.screen.width, y: 1.0/this.app.renderer.screen.height} } 
		);
	
		this.metaballContainer.filters = [this.metaballNormalsFilter];		
		
	  	// Game title text
		const titleText = new PIXI.Text('Magnetic Scrapyard 1000', titleStyle);
		titleText.x = 20;
		titleText.y = 90;
		container.addChild(titleText);

		// Button to go back to menu screen
		
		//this.muteText = new PIXI.Text(`Sound: ${this.muted ? "off" : "on"}`, exitStyle);
		this.muteText = new PIXI.Text(`Sound: ${this.coordinator.sound_meta_obj.muted ? "off" : "on"}`, exitStyle);
		
		this.muteText.x = 0.5 * this.app.screen.width;
		this.muteText.y = 20.0;
		this.muteText.pivot.x = 0.5 * this.muteText.width;
		// These options make the text clickable
		this.muteText.buttonMode = true;
		this.muteText.eventMode = 'dynamic';
		// Go to the menu scene when clicked
		this.muteText.on('pointerup', () => {
			PIXI.sound.toggleMuteAll();
			
			this.coordinator.sound_meta_obj.muted = !this.coordinator.sound_meta_obj.muted;
			this.muteText.text = `Sound: ${this.coordinator.sound_meta_obj.muted ? "off" : "on"}`;
		});
		container.addChild(this.muteText);
		
		
		// Intro
		this.robot = PIXI.Sprite.from('../assets/nice-robot.png');
		this.robot.width = 120;
    	this.robot.height = 120;
		this.robot.x = 100;
		this.robot.y = 220;
		this.robot.anchor.set(0.5);
		const introText = new PIXI.Text('Robo is hungry. Get the Ferro Fluid to Robo.', introDarkerStyle);
		introText.x = 200;
		introText.y = 220;
		container.addChild(introText);
		container.addChild(this.robot);
		
		// Button Level (4) --> 3
		// Text button to go to gameplay screen
		const level4Button = new PIXI.Text('Logo Particles', levelButtonStyle);
		level4Button.x = 35;
		level4Button.y = 400;
		// These options make the text clickable
		level4Button.buttonMode = true;
		level4Button.eventMode = 'dynamic'
		// Go to the gameplay scene when clicked
		level4Button.on('pointerup', () => {
			this.coordinator.gotoScene(new GameplayLevel4(this.coordinator));
		});

		// Button Level (5) --> 4
		// Text button to go to gameplay screen
		const level5Button = new PIXI.Text('Logo Particles (CRT Postprocessing)', levelButtonStyle);
		level5Button.x = 35;
		level5Button.y = 440;
		// These options make the text clickable
		level5Button.buttonMode = true;
		level5Button.eventMode = 'dynamic'
		// Go to the gameplay scene when clicked
		level5Button.on('pointerup', () => {
			this.coordinator.gotoScene(new GameplayLevel5(this.coordinator));
		});

		// Button Level (6) --> 5
		// Text button to go to gameplay screen
		const level6Button = new PIXI.Text('Metaball Particles', levelButtonStyle);
		level6Button.x = 35;
		level6Button.y = 480;
		// These options make the text clickable
		level6Button.buttonMode = true;
		level6Button.eventMode = 'dynamic'
		// Go to the gameplay scene when clicked
		level6Button.on('pointerup', () => {
			this.coordinator.gotoScene(new GameplayLevel6(this.coordinator));
		});

		// Button Level (7) --> 6
		// Text button to go to gameplay screen
		const level7Button = new PIXI.Text('Retro Arcade Demo', levelButtonStyle);
		level7Button.x = 35;
		level7Button.y = 520;
		// These options make the text clickable
		level7Button.buttonMode = true;
		level7Button.eventMode = 'dynamic'
		// Go to the gameplay scene when clicked
		level7Button.on('pointerup', () => {
			this.coordinator.gotoScene(new GameplayLevel7(this.coordinator));
		});
		
		// Button Level (8) --> 7
		// Text button to go to gameplay screen
		const level8Button = new PIXI.Text('Tech Showcase', levelButtonStyle);
		level8Button.x = 35;
		level8Button.y = 560;
		// These options make the text clickable
		level8Button.buttonMode = true;
		level8Button.eventMode = 'dynamic'
		// Go to the gameplay scene when clicked
		level8Button.on('pointerup', () => {
			this.coordinator.gotoScene(new GameplayLevel8(this.coordinator));
		});

		// Button Level (9) --> 8
		// Text button to go to gameplay screen
		const level9Button = new PIXI.Text('Physics Puzzles', levelButtonStyle);
		level9Button.x = 35;
		level9Button.y = 600;
		// These options make the text clickable
		level9Button.buttonMode = true;
		level9Button.eventMode = 'dynamic'
		// Go to the gameplay scene when clicked
		level9Button.on('pointerup', () => {
			this.coordinator.gotoScene(new GameplayLevel9(this.coordinator));
		});
		
		// Finally we add these elements to the new
		// container provided by the coordinator
		container.addChild(titleText);
		container.addChild(level4Button);
		container.addChild(level5Button);
		container.addChild(level6Button);
		container.addChild(level7Button);
		container.addChild(level8Button);
		container.addChild(level9Button);
		container.addChild(this.robot);
		container.addChild(introText);
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
		this.robot.x = 100 + Math.cos(this.elapsed_target_frame_rate_frames/50.0) * 30.0;
		
		// this.bg_img.width  = this.app.renderer.screen.width;
		// this.bg_img.height = this.app.renderer.screen.height;

		this.crtFilter.uniforms.u_time = this.elapsed_target_frame_rate_frames*0.021;
		
		this.metaballNormalsFilter.uniforms.u_time = this.elapsed_target_frame_rate_frames;
		this.metaballNormalsFilter.uniforms.u_rDim = {x: 1.0/this.app.renderer.screen.width, y: 1.0/this.app.renderer.screen.height};
		this.metaballNormalsFilter.uniforms.u_dim = {x: this.app.renderer.screen.width, y: this.app.renderer.screen.height};

		// update gauss blobs
		//gaussSprite.position.x = (Math.sin( tickNum * 0.1 ) + 1.0) * 0.25 * app.screen.width;
		for (let i = 0; i < this.gaussSpriteArray.length; i++) {
			let gaussSprite = this.gaussSpriteArray[i];
			gaussSprite.direction += gaussSprite.turningSpeed * 0.01;
			gaussSprite.x += Math.sin(gaussSprite.direction) * gaussSprite.speed;
			gaussSprite.y += Math.cos(gaussSprite.direction) * gaussSprite.speed;

			// wrap the blobs by testing their bounds...
			if (gaussSprite.x < this.gaussSpriteBounds.x) {
				gaussSprite.x += this.gaussSpriteBounds.width;
			} else if (gaussSprite.x > this.gaussSpriteBounds.x + this.gaussSpriteBounds.width) {
				gaussSprite.x -= this.gaussSpriteBounds.width;
			}

			if (gaussSprite.y < this.gaussSpriteBounds.y) {
				gaussSprite.y += this.gaussSpriteBounds.height;
			} else if (gaussSprite.y > this.gaussSpriteBounds.y + this.gaussSpriteBounds.height) {
				gaussSprite.y -= this.gaussSpriteBounds.height;
			}
		} 
		
		if ( 	this.curr_window_w != this.app.screen.width ||
			this.curr_window_h != this.app.screen.height ) {

			this.gaussSpriteBounds = new PIXI.Rectangle(
				-this.gaussSpriteBoundsPadding,
				-this.gaussSpriteBoundsPadding,
				this.app.screen.width  + this.gaussSpriteBoundsPadding + 100.0,
				this.app.screen.height + this.gaussSpriteBoundsPadding + 100.0,
			);                    
						
			this.crtFilter.uniforms.u_rDim = {x: 1.0/this.app.screen.width, y: 1.0/this.app.screen.height};
			this.crtFilter.uniforms.u_dim = {x: this.app.screen.width, y: this.app.screen.height};

			this.curr_window_w = this.app.screen.width;
			this.curr_window_h = this.app.screen.height;
		}
	
	}

	onFinish() {
		this.app.stage.filters = [];
	}
}