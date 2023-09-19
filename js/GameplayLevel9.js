"use strict";

 // TODO:
 // - enable crt filter
 // - reset cam zooming + zoom level
 // - background picture
 // - always spawn the breakable above the player
 // - make particle system use metaballs
 // - menu text for levels 7-9
 
class GameplayLevel9 {

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
		this.curr_dt_in_msec = this.fixed_simulation_dt_msec;

		this.curr_window_w = 0;
		this.curr_window_h = 0;

		this.debug_vis_collisions = false;
		this.use_crt_filter = false;
		// based on https://www.shadertoy.com/view/Ms23DR#
		this.crtFilter = new PIXI.Filter(
			FilterShaders.myVertexSrc,
			FilterShaders.crtFilterFragmentSrc,
			{ 
				u_time: 0.0, 
				u_rDim: {x: 1.0/this.app.renderer.screen.width, y: 1.0/this.app.renderer.screen.height}, 
				u_dim: {x: this.app.renderer.screen.width, y: this.app.renderer.screen.height},
				u_boostDistortIntensity: 0.99,
				u_baseEmit: 0.125 
			}
		);

		this.enable_cam_zooming = true;
		//this.current_cam_zoom_factor = 0.625; 
		this.cam_zoomed_in_factor = 0.35;
		this.current_cam_zoom_factor = this.cam_zoomed_in_factor;

		this.gfx_utils = new GfxUtils( this.app );
		//this.springMassSystems = [];
		this.soft_body_object_mgr = new SoftBodyObjectMgr( this.app, this.gfx_utils ); // 2nd arg is optional
		
		//this.softBodyContainer = new PIXI.Container();
		//this.softBodyContainer = null;

		
		//this.bg_parallax_sprite = PIXI.Sprite.from( '../assets/cave_background.jpg' );
		this.bg_parallax_sprite = PIXI.Sprite.from( '../assets/cave_background_darker.jpg' );
		//this.bg_parallax_sprite = PIXI.Sprite.from( '../assets/blue_placeholder.jpg' );
		this.bg_parallax_sprite.scale.set(2.5);
		this.bg_parallax_sprite.anchor.set( 0.5, 0.5 );
		
		this.bg_ambient_sound;
		
		this.sceneMapTex = undefined;
		this.sceneMapTexSprite = undefined;
		this.texRT = undefined;
		
		
		this.use_particles = true;
		this.start_add_ps_delay_ticks = -1;
		this.fluidSolverCircleAreaConstraint;
		this.fluidSolverCircleAreaConstraint_original_center_vec2;
		
		this.fluidSolverCircleAreaConstraint2;
		this.fluidSolverCircleAreaConstraint2_original_center_vec2;
		this.wiggleSoftBallPolygon_RB;
		
		this.ps_mgr = undefined;
		this.trigger_particle_fade = false;
									
		this.constraint_remove_start_delay_ticks = 680;
		this.destroy_particles_delay_ticks = 680;
		
		this.softbody_constraints_to_animate_delay_ticks = 120;
		this.softbody_constraints_to_animate_strength = 0.0;
		
		this.damocles_ram_go;
		this.damocles_wall_left_btm_go;
		this.damocles_wall_right_btm_go;
		this.damocles_left_floor_go;
		this.damocles_right_floor_go;
		
		this.beneath_boulder_left_a_go;
		this.beneath_boulder_left_b_go;
		this.beneath_boulder_right_go;		
		
		this.circleAreaConstraint_soft_plank;
		this.circleAreaConstraint_soft_plank_origin_vec2;
		this.circleAreaConstraint_soft_plank_container;
		this.animate_circleAreaConstraint_soft_plank = false;
		
		this.go_mgr = new GameObjectMgr();

		this.player_ship_go_idx = 0;
		this.background_music;
		
		this.keyObject_esc;
	}


	memberMuteThrustSound( key_code ) {
		
		if ( [ 38, 40 ].includes( key_code ) ) { // arrow up/down
			//PIXI.sound.volume( this.coordinator.sound_meta_obj.main_thrust_alias, 0.0 );
			PIXI.sound.stop( this.coordinator.sound_meta_obj.main_thrust_alias );
		} else if ( [ 37, 39, 65, 68 ].includes( key_code ) ) { //arrow left/right, a/d
			//PIXI.sound.volume( this.coordinator.sound_meta_obj.small_thrust_alias, 0.0 );
			PIXI.sound.stop( this.coordinator.sound_meta_obj.small_thrust_alias );
		}
	}
	
  	onStart(container_main) {
		
		this.keyObject_esc = AppUtils.keyboard( "Escape" ); 
		this.keyObject_esc.release = async () => {
			this.coordinator.gotoScene(new Menu(this.coordinator));	
		};
		
		this.coordinator.sound_meta_obj.background_music.stop();
		this.background_music = PIXI.sound.Sound.from({
			url: '../assets/music/Exhale-Dystopian music.mp3',
			autoPlay: true,
			loop: true,
			volume: 0.3,
			complete: function() {
				console.log('Sound finished');
			}
		});
		{ // 1st playback volume hack
			background_music.volume = 0.0001; 
		}
		background_music.volume = 0.3;
		
		
		this.bg_ambient_sound = PIXI.sound.Sound.from({
			url: '../assets/music/squishy_flesh_thingy_seamless-30033.mp3',
			autoPlay: true,
			loop: true,
			volume: 0.2,
			complete: function() {
				console.log('Sound finished');
			}
		});
		{ // 1st playback volume hack
			this.bg_ambient_sound.volume = 0.0001; 
		}
		this.bg_ambient_sound.volume = 0.2;

		
    	// Add this to all levels ----------------
		
		let container = new PIXI.Container();
		let container_GUI = new PIXI.Container();
		container_main.addChild( container );
		container_main.addChild( container_GUI );
		
		this.container = container;
		this.container_main = container_main;
		
		// Level 9 info text
		this.levelInfo = new PIXI.Text('Level 8', levelInfoStyle);
		this.levelInfo.x = 20;
		this.levelInfo.y = 20;
		container_GUI.addChild(this.levelInfo);

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
		container_GUI.addChild(this.exitText);
		
		// ---------------------------------------

		let active_game_object_idx = this.player_ship_go_idx;
		
		container.pivot.x = app.renderer.screen.width/2;
		container.pivot.y = app.renderer.screen.height/2;
		container.position.x = app.renderer.screen.width/2;
		container.position.y = app.renderer.screen.height/2;
	
	
		
		this.translation_speed = 550.0;
		this.rotation_radians_speed = 60.0;
		
		// https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/keyCode			
		this.keys = {};
		window.addEventListener("keydown", (e) => { this.keys[e.keyCode] = true; } );
		window.addEventListener("keyup", (e) => { 
			this.keys[e.keyCode] = false; 
			this.memberMuteThrustSound( e.keyCode );
		} );
		
		if ( false) {// TEST WORKER - nope document and window are near-impossible to pass to another thread
			this.translation_speed = 22.0;
			this.rotation_radians_speed = 0.16;//0.01;
			let translation_speed = this.translation_speed
			let rotation_radians_speed = this.rotation_radians_speed;
			Input.KeyboardController( document, window, 
				this,
				(key_code) => {},
				//() => {GameplayLevel9.muteThrustSound(key_code);}, // works, too!
				(key_code) => {this.memberMuteThrustSound(key_code);},
			{
				
				37: () => { 
					//console.log( `arrow left` ); 
					let selected_go = this.go_mgr.getGameObjects()[ active_game_object_idx ];
					selected_go.rigid_body.applyAngularVelocity( -rotation_radians_speed );
					
					if ( !PIXI.sound.find(this.coordinator.sound_meta_obj.small_thrust_alias).isPlaying ) {
						//PIXI.sound.volume( this.coordinator.sound_meta_obj.small_thrust_alias, 0.25 );
						PIXI.sound.play(this.coordinator.sound_meta_obj.small_thrust_alias, {loop: false});
					}			
					
				},
				39: () => { 
					//console.log( `arrow right` ); 
					let selected_go = this.go_mgr.getGameObjects()[ active_game_object_idx ];
					selected_go.rigid_body.applyAngularVelocity( rotation_radians_speed );
					
					if ( !PIXI.sound.find(this.coordinator.sound_meta_obj.small_thrust_alias).isPlaying ) {
						//PIXI.sound.volume( this.coordinator.sound_meta_obj.small_thrust_alias, 0.25 );
						PIXI.sound.play(this.coordinator.sound_meta_obj.small_thrust_alias, {loop: false});
					}			
					
				},
				38: () => {                         
					//console.log( `arrow up` ); },
					let selected_go = this.go_mgr.getGameObjects()[ active_game_object_idx ];
					//selected_go.applyLinearVelocity( {x: 0.0, y: -translation_speed} );
					const rot_mat = Mat2x3.createRotation( selected_go.getAngle() );
					//let translation_vec2 = Mat2x3.mulDirVector( rot_mat, {x: 0.0, y: -translation_speed * this.curr_dt_in_msec/this.fixed_simulation_dt_msec}  );
					let translation_vec2 = Mat2x3.mulDirVector( rot_mat, {x: 0.0, y: -translation_speed * this.curr_dt_in_msec/this.fixed_simulation_dt_msec}  );
					selected_go.applyLinearVelocity( translation_vec2 );
					
					if ( !PIXI.sound.find(this.coordinator.sound_meta_obj.main_thrust_alias).isPlaying ) {
						//PIXI.sound.volume( this.coordinator.sound_meta_obj.main_thrust_alias, 0.75 );
						PIXI.sound.play(this.coordinator.sound_meta_obj.main_thrust_alias, {loop: false});
					}			

				},
				40: () => { 
					// 		//console.log( `arrow down` ); 
					let selected_go = this.go_mgr.getGameObjects()[ active_game_object_idx ];
					const rot_mat = Mat2x3.createRotation( selected_go.getAngle() );
					let translation_vec2 = Mat2x3.mulDirVector( rot_mat, {x: 0.0, y: translation_speed * 0.5}  );
					selected_go.applyLinearVelocity( translation_vec2 );
					
					if ( !PIXI.sound.find(this.coordinator.sound_meta_obj.main_thrust_alias).isPlaying ) {
						//PIXI.sound.volume( this.coordinator.sound_meta_obj.main_thrust_alias, 0.75 );					
						PIXI.sound.play(this.coordinator.sound_meta_obj.main_thrust_alias, {loop: false});
					}			
					
				},
				65: () => { // 'a'
					let selected_go = this.go_mgr.getGameObjects()[ active_game_object_idx ];
					const rot_mat = Mat2x3.createRotation( selected_go.getAngle() );
					let translation_vec2 = Mat2x3.mulDirVector( rot_mat, {x: -translation_speed * 0.45, y: 0.0}  );
					selected_go.applyLinearVelocity( translation_vec2 );			
					
					if ( !PIXI.sound.find(this.coordinator.sound_meta_obj.small_thrust_alias).isPlaying ) {
						//PIXI.sound.volume( this.coordinator.sound_meta_obj.small_thrust_alias, 0.25 );
						PIXI.sound.play(this.coordinator.sound_meta_obj.small_thrust_alias, {loop: false});
					}						
				},
				68: () => { // 'd'
					let selected_go = this.go_mgr.getGameObjects()[ active_game_object_idx ];
					const rot_mat = Mat2x3.createRotation( selected_go.getAngle() );
					let translation_vec2 = Mat2x3.mulDirVector( rot_mat, {x: translation_speed * 0.45, y: 0.0}  );
					selected_go.applyLinearVelocity( translation_vec2 );					
					
					if ( !PIXI.sound.find(this.coordinator.sound_meta_obj.small_thrust_alias).isPlaying ) {
						//PIXI.sound.volume( this.coordinator.sound_meta_obj.small_thrust_alias, 0.25 );
						PIXI.sound.play(this.coordinator.sound_meta_obj.small_thrust_alias, {loop: false});
					}						
				},
			}, 
			( this.fixed_simulation_dt_msec * 0.001 * 0.25 ) ); 
		}
		
		let keyObject_SPACE = AppUtils.keyboard( " " ); 
		// keyObject_SPACE.press = () => {
		// 	//key object pressed
		// };
		keyObject_SPACE.release = async () => {
			//key object released
			this.debug_vis_collisions = !this.debug_vis_collisions;
			this.go_mgr.setDebugVisibility( this.debug_vis_collisions );
		};
		let keyObject_c = AppUtils.keyboard( "c" ); 
		keyObject_c.release = async () => {
			//key object released
			this.use_crt_filter = !this.use_crt_filter;

			if ( this.use_crt_filter ) {
				//this.app.stage.filters = [ this.crtFilter ];
				this.container_main.filters = [ this.crtFilter ];
			} else {
				//this.app.stage.filters = [];
				this.container_main.filters = [];
			}
		};
		let keyObject_z = AppUtils.keyboard( "z" ); 
		keyObject_z.release = async () => {
			//key object released
			this.enable_cam_zooming = !this.enable_cam_zooming;
		};
	
		
		// ---------------------------------------
		
		if ( this.use_particles ) {
			this.ps_mgr = new ParticleSystemMgr( this.app );
			this.createParticleSystems();
		}
		

		
	
	
		
		// build level

		container.addChild( this.bg_parallax_sprite );

		if ( this.use_particles ) {
			
			container.addChild( this.ps_mgr.ps_container );
			
			//container.addChild( this.softBodyContainer ); // important to add AFTER ps_gr.ps_container
			container.addChild( this.soft_body_object_mgr.getSoftBodyContainer() );
			
			//container.addChild( this.ps_mgr.getParticleSystemAtIdx(0).particleContainer );
			
			//const test_sprite = PIXI.Sprite.from( '../assets/magnetic-field-2.png' );
			//this.ps_mgr.ps_container.addChild( test_sprite ); // WORKS
			//this.ps_mgr.getParticleSystemAtIdx(0).particleContainer.addChild( test_sprite );
			
		}

		this.go_mgr.setCollisionSoundAliases( [ this.coordinator.sound_meta_obj.player_collide_sfx_alias, this.coordinator.sound_meta_obj.object_collide_sfx_alias ] );

		{ // add player ship
			const mass = 50.0;
			//let player_go = this.go_mgr.addPolygonGameObject( [ [ -50.0, -50.0 ], [ 50.0, -50.0 ], [ 0.0, 38.0 ] ], mass );
			//let player_go = this.go_mgr.addPolygonGameObject( [ [ -50.0, -50.0 ], [ 50.0, -50.0 ], [ 0.0, 68.0 ] ], mass );
			let player_go = this.go_mgr.addPolygonGameObject( [ 
				[ -35.0,  60.0 ], 
				[  35.0,  60.0 ], 
				[  48.0,  30.0 ], 
				[  33.0, -20.0 ], 
				[  0.0,  -60.0 ], 
				[ -33.0, -20.0 ],
				[ -48.0,  30.0 ],  
			], mass );
			
			//player_go.setPos( new Vec2( -2570.0, -2290.0 ) ); // good setting for checking circle broad-phase vs. narrow phase collision with polygon
			//player_go.setPos( new Vec2( 1000.0, -2290.0 ) ); // in particle chamber
			//player_go.setPos( new Vec2( 500.0, -1000.0 ) ); 
			//player_go.setPos( new Vec2( -500.0, -2000.0 ) );  // at dodge ram
			
			//!!! 
			player_go.setPos( new Vec2( 250.0, 300.0 ) );  // ### at lvl center START POS ###
			
			//player_go.setPos( new Vec2( 2400.0, 2000.0 ) );  // at dodge ram
			
			// player_go.setPos( new Vec2( 5500.0, 0.0 ) );  // building final tunnel
			
			player_go.setAngle( 0.1 );
			
			this.player_ship_go_idx = this.go_mgr.game_objects.length - 1;
			this.go_mgr.setPlayerGameObjectIndex( this.player_ship_go_idx );
		}
		
		if ( false ) { // breakable floor that always spawns above the player
			// const x_extent_half = 324.0;
			// const y_extent_half = 50.0;
			// const path_pts = [ 
			// 	[ -x_extent_half, y_extent_half * 1.1 ], 
			// 	[ MathUtil.mix(-x_extent_half, x_extent_half, 0.25), 1.9 * y_extent_half], 
			// 	[ x_extent_half, y_extent_half * 0.7 ], 
			// 	[ x_extent_half, -y_extent_half ], 
			// 	[ MathUtil.mix(-x_extent_half, x_extent_half, 0.66), 2.3 * -y_extent_half], 
			// 	[ -x_extent_half, -y_extent_half*.5 ] ];			
			// let spawn_go = this.go_mgr.addPolygonGameObject_Breakable( path_pts, this.coordinator.sound_meta_obj.rock_destroy_alias, () => {} );
			
			const rand_val_A_m1p1 = ( Math.random() * 2.0 - 1.0 );
			const x_extent_half = 160 + rand_val_A_m1p1 * 34;
			
			const rand_val_B_m1p1 = ( Math.random() * 2.0 - 1.0 );
			const y_extent_half = 84 + rand_val_B_m1p1 * 32;
			
			const rand_val_C_m1p1 = ( Math.random() * 2.0 - 1.0 );
			let point_array2 = [];
			for ( let i = 0; i < 15 + Math.floor( rand_val_C_m1p1 * 5 ); i++ ) {
				point_array2.push( [ ( Math.random() * 2.0 - 1.0 ) * x_extent_half, ( Math.random() * 2.0 - 1.0 ) * y_extent_half ] );
			}
			point_array2 = ConvexHull.makeHull( point_array2 );
			
			let spawn_go = this.go_mgr.addPolygonGameObject_Breakable( point_array2, this.coordinator.sound_meta_obj.rock_destroy_alias, () => {} );
			
			let player_go = this.go_mgr.getGameObjects()[ this.player_ship_go_idx ];
			spawn_go.setPos( Vec2.add( player_go.getPos(), new Vec2( 0.0, -1000.0 ) ) );
			spawn_go.applyLinearVelocity( new Vec2( -30.3, 500.0 ) );
		}
		
	
		
		

		let containment_lower_particle_wall_go;
		{ // exhaust pipe and containment for top particle system "Particle Chamber" / Quicksilver Chamber
			{	// "exhaust" pipe for top particle system	
				const x_extent_half = 180.0;
				const y_extent_half = 40.0;
				const path_pts = [ [ -x_extent_half, y_extent_half ], [ x_extent_half, y_extent_half ], [ x_extent_half, -y_extent_half ], [ -x_extent_half, -y_extent_half ] ];
				const mass = 0.0;
				let lvl_wall_prop = this.go_mgr.addPolygonGameObject( path_pts, mass );
				lvl_wall_prop.setPos( new Vec2( 280, -2250.0 ) );
			}
			{ // containment - left wall top ram holder
				const x_extent_half = 375.0;
				const y_extent_half = 260.0;
				const path_pts = [ 
					[ -x_extent_half + 0.45*x_extent_half, y_extent_half ], 
					[  x_extent_half - 0.45*x_extent_half, y_extent_half ], 
					[  x_extent_half, y_extent_half - y_extent_half * 0.45 ], 
					[  x_extent_half, -y_extent_half + y_extent_half * 0.45 ], 
					[  x_extent_half - 0.45*x_extent_half, -y_extent_half ], 
					[ -x_extent_half + 0.45*x_extent_half , -y_extent_half ],
					[ -x_extent_half , -y_extent_half + y_extent_half * 0.45 ]  
				];
				const mass = 0.0;
				let containment_go = this.go_mgr.addPolygonGameObject( path_pts, mass );
				containment_go.setPos( new Vec2( -160.0, -1980.0 ) );
				//ground_floor_go.setAngle( Math.PI * 0.83 );
			}
			{ // containment - left wall btm ram holder
				const x_extent_half = 375.0;
				const y_extent_half = 260.0;
				const path_pts = [ 
					[ -x_extent_half + 0.45*x_extent_half, y_extent_half ], 
					[  x_extent_half - 0.45*x_extent_half, y_extent_half ], 
					[  x_extent_half, y_extent_half - y_extent_half * 0.45 ], 
					[  x_extent_half, -y_extent_half + y_extent_half * 0.45 ], 
					[  x_extent_half - 0.45*x_extent_half, -y_extent_half ], 
					[ -x_extent_half + 0.45*x_extent_half , -y_extent_half ],
					[ -x_extent_half, +y_extent_half - y_extent_half * 0.45 ]  
				];
				const mass = 0.0;
				let containment_go = this.go_mgr.addPolygonGameObject( path_pts, mass );
				containment_go.setPos( new Vec2( -160.0, -1345.0 ) );
				//ground_floor_go.setAngle( Math.PI * 0.83 );
			}
			{ // the dodge RAM
				const x_extent_half = 255.0;
				const y_extent_half = 30.0;
				const path_pts = [
					[ -x_extent_half, y_extent_half ], 
					[ x_extent_half, y_extent_half ], 
					[ x_extent_half + 0.25*x_extent_half, 0 ], 
					[ x_extent_half, -y_extent_half ], 
					[ -x_extent_half, -y_extent_half ] ];
				//const mass = 0.0;
				let lvl_wall_prop = this.go_mgr.addPolygonGameObject( path_pts );
				lvl_wall_prop.setPos( new Vec2( -115, -1640.0 ) );				
			}
			{ // containment - left wall shaft
				const x_extent_half = 355.0;
				const y_extent_half = 630.0;
				const path_pts = [ 
					[ -x_extent_half, y_extent_half ], 
					[ x_extent_half+200, y_extent_half ], 
					[ x_extent_half-20, -y_extent_half ], 
					[ -x_extent_half, -y_extent_half ] ];
				const mass = 0.0;
				let containment_go = this.go_mgr.addPolygonGameObject( path_pts, mass );
				containment_go.setPos( new Vec2( 20.0, -470.0 ) );
				//ground_floor_go.setAngle( Math.PI * 0.83 );
			}
			{ // containment - left wall shaft ledge
				const x_extent_half = 40.0;
				const y_extent_half = 200.0;
				const path_pts = [ 
					[ -x_extent_half-50, y_extent_half ], 
					[ x_extent_half, y_extent_half-80 ], 
					[ x_extent_half+100, -y_extent_half ], 
					[ -x_extent_half-130, -y_extent_half-30 ] ];
				const mass = 0.0;
				let containment_go = this.go_mgr.addPolygonGameObject( path_pts, mass );
				containment_go.setPos( new Vec2( 450.0, -850.0 ) );
				//ground_floor_go.setAngle( Math.PI * 0.83 );
			}
			
			{ // containment - btm wall shaft
				const x_extent_half = 455.0;
				const y_extent_half = 130.0;
				const path_pts = [ 
					[ -x_extent_half, y_extent_half ], 
					[ x_extent_half, y_extent_half ], 
					[ x_extent_half+50, -y_extent_half ], 
					[ -x_extent_half-50, -y_extent_half ] ];
				const mass = 0.0;
				let containment_go = this.go_mgr.addPolygonGameObject( path_pts, mass );
				containment_go.setPos( new Vec2( 780.0, 30.0 ) );
				//ground_floor_go.setAngle( Math.PI * 0.83 );
			}

			
			{ // containment - right wall
				const x_extent_half = 355.0;
				const y_extent_half = 1160.0;
				const path_pts = [ 
					[ -x_extent_half-50, y_extent_half ], 
					[ x_extent_half, y_extent_half-170 ], 
					[ x_extent_half, -y_extent_half-200 ], 
					[ -x_extent_half, -y_extent_half ] ];
				const mass = 0.0;
				let containment_go = this.go_mgr.addPolygonGameObject( path_pts, mass );
				containment_go.setPos( new Vec2( 1550.0, -1100.0 ) );
				//ground_floor_go.setAngle( Math.PI * 0.83 );
			}
			{ // containment - right wall shaft ledge
				const x_extent_half = 125.0;
				const y_extent_half = 260.0;
				const path_pts = [ 
					[ -x_extent_half-50, y_extent_half ], 
					[ x_extent_half, y_extent_half+80 ], 
					[ x_extent_half+20, -y_extent_half ], 
					[ -x_extent_half-190, -y_extent_half-30 ] ];
				const mass = 0.0;
				let containment_go = this.go_mgr.addPolygonGameObject( path_pts, mass );
				containment_go.setPos( new Vec2( 1005.0, -1100.0 ) );
				//ground_floor_go.setAngle( Math.PI * 0.83 );
			}
			{ // containment - right wall
				const x_extent_half = 355.0;
				const y_extent_half = 1100.0;
				const path_pts = [ 
					[ -x_extent_half-50, y_extent_half ], 
					[ x_extent_half, y_extent_half-600 ], 
					[ x_extent_half, -y_extent_half-350 ], 
					[ -x_extent_half, -y_extent_half ] ];
				const mass = 0.0;
				let containment_go = this.go_mgr.addPolygonGameObject( path_pts, mass );
				containment_go.setPos( new Vec2( 2250.0, -1400.0 ) );
			}
			
			{ // containment - lower wall - on break, change particle system constraints
				const x_extent_half = 510.0;
				const y_extent_half = 150.0;
				const path_pts = [ 
					[ -x_extent_half, y_extent_half * 1.1 ], 
					[ MathUtil.mix(-x_extent_half, x_extent_half, 0.25), 1.02 * y_extent_half], 
					//[ x_extent_half, y_extent_half * 0.98 ], 
					[ x_extent_half, y_extent_half * 0.25 ], 
					[ x_extent_half, -y_extent_half ], 
					[ MathUtil.mix(-x_extent_half, x_extent_half, 0.66), 1.01 * -y_extent_half], 
					[ -x_extent_half, -y_extent_half*.95 ] ];
				const mass = 0.0;
				containment_lower_particle_wall_go = this.go_mgr.addPolygonGameObject_Breakable( 
					path_pts, 
					this.coordinator.sound_meta_obj.rock_destroy_alias, 
					() => { // particle-containment floor broke
						console.log( "containment wall broken!" );
						
						this.trigger_particle_fade = true; // start fading out
						
						const particle_sys_idx = 0; // we know that the particle system is the first that we create
						let particle_sys = this.ps_mgr.getParticleSystemAtIdx(particle_sys_idx);
						particle_sys.particleFluidSolver.constraints = [];
						// while( particle_sys.particleFluidSolver.constraints.length > 1 ) {
						// 	particle_sys.particleFluidSolver.constraints.splice( 1, 1 ); // remove only the wall constraint, keep the circle constraint
						// }
						
												
						{ // top wall
							const plane_equ_normal_x = 0.0;
							const plane_equ_normal_y = 1.0;
							const pos_on_plane = { x: 0.0, y: -150.0 };
							const plane_equ_dist_to_origin = -(plane_equ_normal_x * pos_on_plane.x + plane_equ_normal_y * pos_on_plane.y);
							let fluidSolverPlaneConstraint = new ParticleBoundaryConstraintPlane(
								particle_sys.particle_radius,
								{ x: plane_equ_normal_x, y: plane_equ_normal_y, z: plane_equ_dist_to_origin });
							particle_sys.addParticleSystemConstraint(fluidSolverPlaneConstraint);
						}
			

						{ // right wall, 
							// let normal = new Vec2( -1.0, 0.1 ); // ever so slightly still slope toward top left
							let normal = new Vec2( -1.0, -0.01 ); // toward top left

							normal.normalize();
							const plane_equ_normal_x = normal.x;
							const plane_equ_normal_y = normal.y;
							// const plane_equ_normal_x = -1.0 / Math.sqrt(2.0);
							// const plane_equ_normal_y = -1.0 / Math.sqrt(2.0);
							//const pos_on_plane = { x: 1950.0, y: 1550.0 };
							const pos_on_plane = { x: 850.0, y: 0.0 };
							const plane_equ_dist_to_origin = -(plane_equ_normal_x * pos_on_plane.x + plane_equ_normal_y * pos_on_plane.y);
							let fluidSolverPlaneConstraint = new ParticleBoundaryConstraintPlane(
								particle_sys.particle_radius,
								{ x: plane_equ_normal_x, y: plane_equ_normal_y, z: plane_equ_dist_to_origin });
							particle_sys.addParticleSystemConstraint(fluidSolverPlaneConstraint);
						}
			
						{ // slope toward top left
							let normal = new Vec2( 1.0, -0.15 );
							normal.normalize();
							const plane_equ_normal_x = normal.x;
							const plane_equ_normal_y = normal.y;
							
							// const plane_equ_normal_x = 1.0 / Math.sqrt(2.0);
							// const plane_equ_normal_y = -1.0 / Math.sqrt(2.0);
							const pos_on_plane = { x: -0.0, y: 550.0 };
							const plane_equ_dist_to_origin = -(plane_equ_normal_x * pos_on_plane.x + plane_equ_normal_y * pos_on_plane.y);
							let fluidSolverPlaneConstraint = new ParticleBoundaryConstraintPlane(
								particle_sys.particle_radius,
								{ x: plane_equ_normal_x, y: plane_equ_normal_y, z: plane_equ_dist_to_origin });
							particle_sys.addParticleSystemConstraint(fluidSolverPlaneConstraint);
						}
						
						{ // btm wall
							const plane_equ_normal_x = 0.0;
							const plane_equ_normal_y = -1.0;
							//const pos_on_plane = { x: 0.0, y: 5050.0 };
							const pos_on_plane = { x: 0.0, y: 2450.0 }; // relative to original sim-grid coord
							const plane_equ_dist_to_origin = -(plane_equ_normal_x * pos_on_plane.x + plane_equ_normal_y * pos_on_plane.y);
							let fluidSolverPlaneConstraint = new ParticleBoundaryConstraintPlane(
								particle_sys.particle_radius,
								{ x: plane_equ_normal_x, y: plane_equ_normal_y, z: plane_equ_dist_to_origin });
							particle_sys.addParticleSystemConstraint(fluidSolverPlaneConstraint);
						}

						this.start_add_ps_delay_ticks = 200;
					}, 
					mass );
				//let containment_go = this.go_mgr.addPolygonGameObject( path_pts, mass );
				containment_lower_particle_wall_go.setPos( new Vec2( 660.0, -1780.0 ) );
				//ground_floor_go.setAngle( Math.PI * 0.83 );
			}
			
		}
		const level_L_x = -4000.0;
		const level_R_x =  4000.0;
		const level_T_y = -4000.0;
		const level_B_y =  4000.0;
		
		if ( false ) { // lvl - top boundary (just for layouting)
			const x_extent_half = ( level_R_x - level_L_x ) * 0.5;
			const y_extent_half = 100.0;
			const path_pts = [ [ -x_extent_half, y_extent_half ], [ x_extent_half, y_extent_half ], [ x_extent_half, -y_extent_half ], [ -x_extent_half, -y_extent_half ] ];
			const mass = 0.0;
			let lvl_wall_prop = this.go_mgr.addPolygonGameObject( path_pts, mass );
			lvl_wall_prop.setPos( new Vec2( level_L_x + x_extent_half, level_T_y + y_extent_half ) );
		}
		
		if ( false ) { // lvl - btm boundary (just for layouting)
			const x_extent_half = ( level_R_x - level_L_x ) * 0.5;
			const y_extent_half = 100.0;
			const path_pts = [ [ -x_extent_half, y_extent_half ], [ x_extent_half, y_extent_half ], [ x_extent_half, -y_extent_half ], [ -x_extent_half, -y_extent_half ] ];
			const mass = 0.0;
			let lvl_wall_prop = this.go_mgr.addPolygonGameObject( path_pts, mass );
			lvl_wall_prop.setPos( new Vec2( level_L_x + x_extent_half, level_B_y - y_extent_half ) );
		}

		if ( false ) { // lvl - left boundary (just for layouting)
			const x_extent_half = 100.0;
			const y_extent_half = ( level_B_y - level_T_y ) * 0.5;
			const path_pts = [ [ -x_extent_half, y_extent_half ], [ x_extent_half, y_extent_half ], [ x_extent_half, -y_extent_half ], [ -x_extent_half, -y_extent_half ] ];
			const mass = 0.0;
			let lvl_wall_prop = this.go_mgr.addPolygonGameObject( path_pts, mass );
			lvl_wall_prop.setPos( new Vec2( level_L_x + x_extent_half, level_T_y + y_extent_half ) );
		}

		if ( false ) { // lvl - right boundary (just for layouting)
			const x_extent_half = 100.0;
			const y_extent_half = ( level_B_y - level_T_y ) * 0.5;
			const path_pts = [ [ -x_extent_half, y_extent_half ], [ x_extent_half, y_extent_half ], [ x_extent_half, -y_extent_half ], [ -x_extent_half, -y_extent_half ] ];
			const mass = 0.0;
			let lvl_wall_prop = this.go_mgr.addPolygonGameObject( path_pts, mass );
			lvl_wall_prop.setPos( new Vec2( level_R_x - x_extent_half, level_T_y + y_extent_half ) );
		}
		
		let top_left_rock_path = [];
		let btm_left_rock_path = [];
		{ // top rocks
			let right_x = level_L_x;
			let adj_dx = 0;
			let adj_dy = -1900; // the first time => -2*sy + 900
			{ // top 1
				const mass = 0.0;
				const sx = 600.0;
				const sy = 500.0;
				let path_pts = [ 
					[ -sx, -sy ], // top left
					[ +sx-200, -sy ], // top right
					[ +sx, +sy ], 
					//[ -sx, +sy+800 ] 
					//[ -sx - adj_dx, -sy - adj_dy ]
				];
				path_pts.push( [ path_pts[0][0] - adj_dx, path_pts[0][1] - adj_dy ] ); // last point
				//top_left_rock_path = path_pts;
				path_pts.forEach( (pt) => {
					top_left_rock_path.push( pt );
				} );
				let lvl_wall_prop = this.go_mgr.addPolygonGameObject( path_pts, mass );
				
				const pt_TL_idx = 0;
				const pt_TL = Vec2.fromArray( lvl_wall_prop.rigid_body.relative_path_points_ccw[ pt_TL_idx ] );
				const pt_TR_idx = 1;
				const pt_TR = Vec2.fromArray( lvl_wall_prop.rigid_body.relative_path_points_ccw[ pt_TR_idx ] );
				
				const top_left_coord = Vec2.sub( pt_TL, lvl_wall_prop.rigid_body.center_of_mass_vec2 );
				const pos = { x: right_x - top_left_coord.x, y: level_T_y - top_left_coord.y };
				lvl_wall_prop.setPos( new Vec2( pos.x+0.00001, pos.y-0.00001 ) );
				
				const width = pt_TR.x - pt_TL.x;
				right_x += width;
				adj_dx = path_pts[1][0]-path_pts[2][0];
				adj_dy = path_pts[1][1]-path_pts[2][1];
			}

			{ // top 2
				const mass = 0.0;
				let path_pts = [ 
					[ -1000, -500 ], // top left
					[ +700, -500 ], // top right
					[ +500, +500 ] 
				];
				path_pts.push( [ path_pts[0][0] - adj_dx, path_pts[0][1] - adj_dy ] ); // last point
				let lvl_wall_prop = this.go_mgr.addPolygonGameObject( path_pts, mass );

				const pt_TL_idx = 0;
				const pt_TL = Vec2.fromArray( lvl_wall_prop.rigid_body.relative_path_points_ccw[ pt_TL_idx ] );
				const pt_TR_idx = 1;
				const pt_TR = Vec2.fromArray( lvl_wall_prop.rigid_body.relative_path_points_ccw[ pt_TR_idx ] );
				
				const top_left_coord = Vec2.sub( pt_TL, lvl_wall_prop.rigid_body.center_of_mass_vec2 );
				const pos = { x: right_x - top_left_coord.x, y: level_T_y - top_left_coord.y };
				lvl_wall_prop.setPos( new Vec2( pos.x, pos.y ) );
				
				const width = pt_TR.x - pt_TL.x;
				right_x += width;
				adj_dx = path_pts[1][0]-path_pts[2][0];
				adj_dy = path_pts[1][1]-path_pts[2][1];
			}

			{ // top 3
				const mass = 0.0;
				let path_pts = [ 
					[ -1000, -500 ], // top left
					[ +600, -500 ], // top right
					[ +1000, +900 ], 
					[ +400, +1300 ],
					[ -400, +1300 ],
				];
				path_pts.push( [ path_pts[0][0] - adj_dx, path_pts[0][1] - adj_dy ] ); // last point
				let lvl_wall_prop = this.go_mgr.addPolygonGameObject( path_pts, mass );

				const pt_TL_idx = 0;
				const pt_TL = Vec2.fromArray( lvl_wall_prop.rigid_body.relative_path_points_ccw[ pt_TL_idx ] );
				const pt_TR_idx = 1;
				const pt_TR = Vec2.fromArray( lvl_wall_prop.rigid_body.relative_path_points_ccw[ pt_TR_idx ] );
				
				const top_left_coord = Vec2.sub( pt_TL, lvl_wall_prop.rigid_body.center_of_mass_vec2 );
				const pos = { x: right_x - top_left_coord.x, y: level_T_y - top_left_coord.y };
				lvl_wall_prop.setPos( new Vec2( pos.x, pos.y ) );
				
				const width = pt_TR.x - pt_TL.x;
				right_x += width;
				adj_dx = path_pts[1][0]-path_pts[2][0];
				adj_dy = path_pts[1][1]-path_pts[2][1];
			}

			{ // top 4
				const mass = 0.0;
				let path_pts = [ 
					[ -1000, -500 ], // top left
					[ +3100, -500 ], // top right
					[ +3000, +100 ], 
					[ +200, +1450 ],
				];
				path_pts.push( [ path_pts[0][0] - adj_dx, path_pts[0][1] - adj_dy ] ); // last point
				let lvl_wall_prop = this.go_mgr.addPolygonGameObject( path_pts, mass );

				const pt_TL_idx = 0;
				const pt_TL = Vec2.fromArray( lvl_wall_prop.rigid_body.relative_path_points_ccw[ pt_TL_idx ] );
				const pt_TR_idx = 1;
				const pt_TR = Vec2.fromArray( lvl_wall_prop.rigid_body.relative_path_points_ccw[ pt_TR_idx ] );
				
				const top_left_coord = Vec2.sub( pt_TL, lvl_wall_prop.rigid_body.center_of_mass_vec2 );
				const pos = { x: right_x - top_left_coord.x, y: level_T_y - top_left_coord.y };
				lvl_wall_prop.setPos( new Vec2( pos.x, pos.y ) );
				
				const width = pt_TR.x - pt_TL.x;
				right_x += width;
				adj_dx = path_pts[1][0]-path_pts[2][0];
				adj_dy = path_pts[1][1]-path_pts[2][1];
			}
			
		}
		
		{ // left rocks
			const first_rock_left_height = top_left_rock_path[top_left_rock_path.length-1][1] - top_left_rock_path[0][1];
			let top_y = level_T_y + first_rock_left_height;
			
			const first_connect_slope = 
				(top_left_rock_path[top_left_rock_path.length-2][1] - top_left_rock_path[top_left_rock_path.length-1][1]) /
				(top_left_rock_path[top_left_rock_path.length-2][0] - top_left_rock_path[top_left_rock_path.length-1][0]);
			
			let adj_dx = 0;
			let adj_dy = 0;
			{ // left 1
				const mass = 0.0;
				const sx = 350.0;
				const sy = 800.0;
				const first_w = 200;
				let path_pts = [ 
					[ -sx, +sy ], // btm left
					[ -sx, -sy ], // top left
					[ -sx+first_w, -sy+first_w*first_connect_slope ],  //corr 1st time
					[ +sx + 100, sy*0.66 ],
					[ +sx, sy+200 ], 
				];
				let lvl_wall_prop = this.go_mgr.addPolygonGameObject( path_pts, mass );
				
				const pt_BL_idx = 0;
				const pt_BL = Vec2.fromArray( lvl_wall_prop.rigid_body.relative_path_points_ccw[ pt_BL_idx ] );
				const pt_TL_idx = 1;
				const pt_TL = Vec2.fromArray( lvl_wall_prop.rigid_body.relative_path_points_ccw[ pt_TL_idx ] );
				
				const btm_left_coord = Vec2.sub( pt_BL, lvl_wall_prop.rigid_body.center_of_mass_vec2 );
				const pos = { x: level_L_x - btm_left_coord.x, y: top_y - btm_left_coord.y };

				const height = pt_BL.y - pt_TL.y;
				top_y += height;

				lvl_wall_prop.setPos( new Vec2( pos.x+0.0001, pos.y-0.0001 + height ) );
				
				adj_dx = path_pts[path_pts.length-1][0]-path_pts[0][0];
				adj_dy = path_pts[path_pts.length-1][1]-path_pts[0][1];
			}

			{ // left 2
				const mass = 0.0;
				const sx = 350.0;
				const sy = 500.0;
				let path_pts = [ 
					[ -sx, +sy ], // btm left
					[ -sx, -sy ], // top left
					[ -sx + adj_dx, -sy + adj_dy ],
					[ +sx - 100, +sy + 50 ],
				];
				let lvl_wall_prop = this.go_mgr.addPolygonGameObject( path_pts, mass );
				
				const pt_BL_idx = 0;
				const pt_BL = Vec2.fromArray( lvl_wall_prop.rigid_body.relative_path_points_ccw[ pt_BL_idx ] );
				const pt_TL_idx = 1;
				const pt_TL = Vec2.fromArray( lvl_wall_prop.rigid_body.relative_path_points_ccw[ pt_TL_idx ] );
				
				const btm_left_coord = Vec2.sub( pt_BL, lvl_wall_prop.rigid_body.center_of_mass_vec2 );
				const pos = { x: level_L_x - btm_left_coord.x, y: top_y - btm_left_coord.y - 0.0001 };

				const height = pt_BL.y - pt_TL.y;
				top_y += height;
				lvl_wall_prop.setPos( new Vec2( pos.x, pos.y + height ) );
				
				adj_dx = path_pts[path_pts.length-1][0]-path_pts[0][0];
				adj_dy = path_pts[path_pts.length-1][1]-path_pts[0][1];
			}

			{ // left 3
				const mass = 0.0;
				const sx = 350.0;
				const sy = 500.0;
				let path_pts = [ 
					[ -sx, +sy ], // btm left
					[ -sx, -sy ], // top left
					[ -sx + adj_dx, -sy + adj_dy ],
					[ +sx + 200, +sy - 100 ],
				];
				let lvl_wall_prop = this.go_mgr.addPolygonGameObject( path_pts, mass );
				
				const pt_BL_idx = 0;
				const pt_BL = Vec2.fromArray( lvl_wall_prop.rigid_body.relative_path_points_ccw[ pt_BL_idx ] );
				const pt_TL_idx = 1;
				const pt_TL = Vec2.fromArray( lvl_wall_prop.rigid_body.relative_path_points_ccw[ pt_TL_idx ] );
				
				const btm_left_coord = Vec2.sub( pt_BL, lvl_wall_prop.rigid_body.center_of_mass_vec2 );
				const pos = { x: level_L_x - btm_left_coord.x, y: top_y - btm_left_coord.y };

				const height = pt_BL.y - pt_TL.y;
				top_y += height;
				lvl_wall_prop.setPos( new Vec2( pos.x, pos.y + height ) );
				
				adj_dx = path_pts[path_pts.length-1][0]-path_pts[0][0];
				adj_dy = path_pts[path_pts.length-1][1]-path_pts[0][1];
			}

			
			{ // left 4
				const mass = 0.0;
				const sx = 350.0;
				const sy = 600.0;
				let path_pts = [ 
					[ -sx, +sy ], // btm left
					[ -sx, -sy ], // top left
					[ -sx + adj_dx, -sy + adj_dy ],
					[ +sx - 250, +sy + 80 ],
				];
				let lvl_wall_prop = this.go_mgr.addPolygonGameObject( path_pts, mass );
				
				const pt_BL_idx = 0;
				const pt_BL = Vec2.fromArray( lvl_wall_prop.rigid_body.relative_path_points_ccw[ pt_BL_idx ] );
				const pt_TL_idx = 1;
				const pt_TL = Vec2.fromArray( lvl_wall_prop.rigid_body.relative_path_points_ccw[ pt_TL_idx ] );
				
				const btm_left_coord = Vec2.sub( pt_BL, lvl_wall_prop.rigid_body.center_of_mass_vec2 );
				const pos = { x: level_L_x - btm_left_coord.x, y: top_y - btm_left_coord.y - 0.0001 };

				const height = pt_BL.y - pt_TL.y;
				top_y += height;
				lvl_wall_prop.setPos( new Vec2( pos.x, pos.y + height ) );
				
				adj_dx = path_pts[path_pts.length-1][0]-path_pts[0][0];
				adj_dy = path_pts[path_pts.length-1][1]-path_pts[0][1];
			}

			{ // left 5
				const mass = 0.0;
				const sx = 750.0;
				const sy = (level_B_y - top_y) * 0.5;
				let path_pts = [ 
					[ -sx, +sy ], // btm left
					[ -sx, -sy ], // top left
					[ -sx + adj_dx, -sy + adj_dy ],					
					[ +sx + 800, +sy ],
				];
				path_pts.forEach( (pt) => {
					btm_left_rock_path.push( pt );
				} );

				let lvl_wall_prop = this.go_mgr.addPolygonGameObject( path_pts, mass );
				
				const pt_BL_idx = 0;
				const pt_BL = Vec2.fromArray( lvl_wall_prop.rigid_body.relative_path_points_ccw[ pt_BL_idx ] );
				const pt_TL_idx = 1;
				const pt_TL = Vec2.fromArray( lvl_wall_prop.rigid_body.relative_path_points_ccw[ pt_TL_idx ] );
				
				const btm_left_coord = Vec2.sub( pt_BL, lvl_wall_prop.rigid_body.center_of_mass_vec2 );
				const pos = { x: level_L_x - btm_left_coord.x, y: top_y - btm_left_coord.y };

				const height = pt_BL.y - pt_TL.y;
				top_y += height;
				lvl_wall_prop.setPos( new Vec2( pos.x, pos.y + height ) );
				
				adj_dx = path_pts[path_pts.length-1][0]-path_pts[0][0];
				adj_dy = path_pts[path_pts.length-1][1]-path_pts[0][1];
			}
			
			
			
			
			{ // btm rocks
				const first_rock_left_width = btm_left_rock_path[top_left_rock_path.length-1][0] - btm_left_rock_path[0][0];
				let right_x = level_L_x + first_rock_left_width;
				
				const first_connect_slope = 
					(btm_left_rock_path[top_left_rock_path.length-2][1] - btm_left_rock_path[top_left_rock_path.length-1][1]) /
					(btm_left_rock_path[top_left_rock_path.length-2][0] - btm_left_rock_path[top_left_rock_path.length-1][0]);
				
				let adj_dx = 0;
				let adj_dy = 0;
				{ // btm 1
					const mass = 0.0;
					const sx = 950.0;
					const sy = 400.0;
					const first_w = 200;
					let path_pts = [ 
						[ +sx, +sy ], // btm right
						[ -sx, +sy ], // btm left
						[ -sx-first_w/first_connect_slope, +sy-first_w ],  //corr 1st time
						//[ -sx, +sy-first_w*first_connect_slope ],  //corr 1st time
						[ +sx, -sy*1.66 ],
						[ +sx+500, -sy ], 
					];
					let lvl_wall_prop = this.go_mgr.addPolygonGameObject( path_pts, mass );
					
					const pt_BR_idx = 0;
					const pt_BR = Vec2.fromArray( lvl_wall_prop.rigid_body.relative_path_points_ccw[ pt_BR_idx ] );
					const pt_BL_idx = 1;
					const pt_BL = Vec2.fromArray( lvl_wall_prop.rigid_body.relative_path_points_ccw[ pt_BL_idx ] );
					
					const btm_left_coord = Vec2.sub( pt_BR, lvl_wall_prop.rigid_body.center_of_mass_vec2 );
					const pos = { x: right_x - btm_left_coord.x, y: level_B_y - btm_left_coord.y };
	
					const width = pt_BR.x - pt_BL.x;
					right_x += width;
	
					lvl_wall_prop.setPos( new Vec2( pos.x+0.0001 + width, pos.y-0.0001 ) );
					
					adj_dx = path_pts[path_pts.length-1][0]-path_pts[0][0];
					adj_dy = path_pts[path_pts.length-1][1]-path_pts[0][1];
				}
	
				if ( true ) { // btm 2
					const mass = 0.0;
					const sx = 950.0;
					const sy = 200.0;

					let path_pts = [ 
						[ +sx+200, +sy ], // btm right
						[ -sx, +sy ], // btm left
						[ -sx+adj_dx, +sy+adj_dy ],  //corr 1st time
						[ +sx*0.75, -sy*1.66 ],
						[ +sx+100, -sy ], 
					];
					
					let lvl_wall_prop = this.go_mgr.addPolygonGameObject( path_pts, mass );
					
					const pt_BR_idx = 0;
					const pt_BR = Vec2.fromArray( lvl_wall_prop.rigid_body.relative_path_points_ccw[ pt_BR_idx ] );
					const pt_BL_idx = 1;
					const pt_BL = Vec2.fromArray( lvl_wall_prop.rigid_body.relative_path_points_ccw[ pt_BL_idx ] );
					
					const btm_left_coord = Vec2.sub( pt_BR, lvl_wall_prop.rigid_body.center_of_mass_vec2 );
					const pos = { x: right_x - btm_left_coord.x, y: level_B_y - btm_left_coord.y };
	
					const width = pt_BR.x - pt_BL.x;
					right_x += width;
	
					lvl_wall_prop.setPos( new Vec2( pos.x+0.0001 + width, pos.y-0.0001 ) );
					
					adj_dx = path_pts[path_pts.length-1][0]-path_pts[0][0];
					adj_dy = path_pts[path_pts.length-1][1]-path_pts[0][1];
				}

				{ // btm 3
					const mass = 0.0;
					const sx = 950.0;
					const sy = 200.0;
	
					let path_pts = [ 
						[ +sx, +sy ], // btm right
						[ -sx, +sy ], // btm left
						[ -sx+adj_dx, +sy+adj_dy ],  //corr 1st time
						[ +sx, -sy ],
					];
					
					let lvl_wall_prop = this.go_mgr.addPolygonGameObject( path_pts, mass );
					
					const pt_BR_idx = 0;
					const pt_BR = Vec2.fromArray( lvl_wall_prop.rigid_body.relative_path_points_ccw[ pt_BR_idx ] );
					const pt_BL_idx = 1;
					const pt_BL = Vec2.fromArray( lvl_wall_prop.rigid_body.relative_path_points_ccw[ pt_BL_idx ] );
					
					const btm_left_coord = Vec2.sub( pt_BR, lvl_wall_prop.rigid_body.center_of_mass_vec2 );
					const pos = { x: right_x - btm_left_coord.x, y: level_B_y - btm_left_coord.y };
	
					const width = pt_BR.x - pt_BL.x;
					right_x += width;
	
					lvl_wall_prop.setPos( new Vec2( pos.x+0.0001 + width, pos.y-0.0001 ) );
					
					adj_dx = path_pts[path_pts.length-1][0]-path_pts[0][0];
					adj_dy = path_pts[path_pts.length-1][1]-path_pts[0][1];
				}
	
			}
			
			{ // right rocks 
				let top_y = level_T_y;
				if ( false ) { // right 1
					const mass = 0.0;
					const sx = 350.0;
					const sy = 800.0;
					const first_w = 200;
					let path_pts = [ 
						[ -sx, +sy ], // btm left
						[ -sx, -sy ], // top left
						[ -sx+first_w, -sy+first_w*first_connect_slope ],  //corr 1st time
						[ +sx + 100, sy*0.66 ],
						[ +sx, sy+200 ], 
					];
					let lvl_wall_prop = this.go_mgr.addPolygonGameObject( path_pts, mass );
					
					const pt_BL_idx = 0;
					const pt_BL = Vec2.fromArray( lvl_wall_prop.rigid_body.relative_path_points_ccw[ pt_BL_idx ] );
					const pt_TL_idx = 1;
					const pt_TL = Vec2.fromArray( lvl_wall_prop.rigid_body.relative_path_points_ccw[ pt_TL_idx ] );
					
					const btm_left_coord = Vec2.sub( pt_BL, lvl_wall_prop.rigid_body.center_of_mass_vec2 );
					const pos = { x: level_L_x - btm_left_coord.x, y: top_y - btm_left_coord.y };
		
					const height = pt_BL.y - pt_TL.y;
					top_y += height;
		
					lvl_wall_prop.setPos( new Vec2( pos.x+0.0001, pos.y-0.0001 + height ) );
					
					adj_dx = path_pts[path_pts.length-1][0]-path_pts[0][0];
					adj_dy = path_pts[path_pts.length-1][1]-path_pts[0][1];
				}				
			}		
		}
		
		{ // floor start pos
			const x_extent_half = 700.0;
			const y_extent_half = 50.0;
			const path_pts = [ 
				[ -x_extent_half, y_extent_half ], 
				[ x_extent_half, y_extent_half ], 
				[ x_extent_half, -y_extent_half ], 
				[ -x_extent_half, -y_extent_half ] ];
			const mass = 0.0;
			let ground_floor_go = this.go_mgr.addPolygonGameObject( path_pts, mass );
			ground_floor_go.setPos( new Vec2( -300.0, 1424.0 - 2.1 * y_extent_half ) );
		}
		{ // floor start pos 2
			const x_extent_half = 400.0;
			const y_extent_half = 50.0;
			const path_pts = [ [ -x_extent_half, y_extent_half ], [ x_extent_half, y_extent_half ], [ x_extent_half, -y_extent_half ], [ -x_extent_half, -y_extent_half ] ];
			const mass = 0.0;
			let ground_floor_go = this.go_mgr.addPolygonGameObject( path_pts, mass );
			ground_floor_go.setPos( new Vec2( 1600.0, 1424.0 - 2.1 * y_extent_half ) );
		}
		{ // right slope
			const x_extent_half = 1000.0;
			const y_extent_half = 50.0;
			const path_pts = [ 
				[ -x_extent_half, y_extent_half ], 
				[ x_extent_half, y_extent_half ], 
				[ x_extent_half+50, -y_extent_half ], 
				[ -x_extent_half+50, -y_extent_half ] ];
			const mass = 0.0;
			let ground_floor_go = this.go_mgr.addPolygonGameObject( path_pts, mass );
			ground_floor_go.setPos( new Vec2( 2850.0, 810.0 ) );
			ground_floor_go.setAngle( Math.PI * 0.83 );
		}
		
		{ // right slightly sloped wall - caps top "tunnel"
			const x_extent_half = 60.0;
			const y_extent_half = 700.0;
			const path_pts = [ [ -x_extent_half, y_extent_half ], [ x_extent_half, y_extent_half ], [ x_extent_half, -y_extent_half ], [ -x_extent_half, -y_extent_half ] ];
			const mass = 0.0;
			let ground_floor_go = this.go_mgr.addPolygonGameObject( path_pts, mass );
			ground_floor_go.setPos( new Vec2( 3000.0,-100.0 ) );
			ground_floor_go.setAngle( Math.PI * -0.2 );
		}
		
		{ // damocles dodge RAM
			const x_extent_half = 255.0;
			const y_extent_half = 30.0;
			const path_pts = [
				[ -x_extent_half, y_extent_half ], 
				[ x_extent_half, y_extent_half ], 
				[ x_extent_half + 0.25*x_extent_half, 0 ], 
				[ x_extent_half, -y_extent_half ], 
				[ -x_extent_half, -y_extent_half ] ];
			
			const mass = 0.0;
			//const mass = SimulationParameters.rigidBodyDefaultMass();
			
			this.damocles_ram_go = this.go_mgr.addPolygonGameObject( path_pts, mass );
			this.damocles_ram_go.setPos( new Vec2( 800, 480.0 ) );				
			this.damocles_ram_go.setAngle( Math.PI * 0.5 );
		}
		{ // damocles wall left top
			const x_extent_half = 25.0;
			const y_extent_half = 355.0;
			const path_pts = [
				[ -x_extent_half, y_extent_half ], 
				[ x_extent_half, y_extent_half-50 ], 
				[ x_extent_half, -y_extent_half ], 
				[ -x_extent_half, -y_extent_half ] ];
			const mass = 0.0;
			let damocles_wall_left_top_go = this.go_mgr.addPolygonGameObject( path_pts, mass );
			damocles_wall_left_top_go.setPos( new Vec2( 735, 500.0 ) );
		}
		{ // damocles wall left btm
			const x_extent_half = 25.0;
			const y_extent_half = 205.0;
			const path_pts = [
				[ -x_extent_half, y_extent_half ], 
				[ x_extent_half, y_extent_half ], 
				[ x_extent_half, -y_extent_half-50 ], 
				[ -x_extent_half, -y_extent_half ] ];
			const mass = 0.0;
			this.damocles_wall_left_btm_go = this.go_mgr.addPolygonGameObject( path_pts, mass );
			this.damocles_wall_left_btm_go.setPos( new Vec2( 735, 1055.0 ) );
		}
		{ // damocles left floor
			const x_extent_half = 180.0;
			const y_extent_half = 50.0;
			const path_pts = [ [ -x_extent_half, y_extent_half ], [ x_extent_half, y_extent_half ], [ x_extent_half, -y_extent_half ], [ -x_extent_half, -y_extent_half ] ];
			const mass = 0.0;
			this.damocles_left_floor_go = this.go_mgr.addPolygonGameObject( path_pts, mass );
			this.damocles_left_floor_go.setPos( new Vec2( 580.0, 1424.0 - 2.1 * y_extent_half ) );
		}
		{ // damocles right floor
			const x_extent_half = 180.0;
			const y_extent_half = 50.0;
			const path_pts = [ [ -x_extent_half, y_extent_half ], [ x_extent_half, y_extent_half ], [ x_extent_half, -y_extent_half ], [ -x_extent_half, -y_extent_half ] ];
			const mass = 0.0;
			this.damocles_right_floor_go = this.go_mgr.addPolygonGameObject( path_pts, mass );
			this.damocles_right_floor_go.setPos( new Vec2( 1020.0, 1424.0 - 2.1 * y_extent_half ) );
		}
		{ // damocles floor breakable
			const x_extent_half = 424.0;
			const y_extent_half = 120.0;
			// const path_pts = [ 
			// 	[ -x_extent_half, y_extent_half * 1.1 ], 
			// 	[ MathUtil.mix(-x_extent_half, x_extent_half, 0.25), 1.9 * y_extent_half], 
			// 	[ x_extent_half, y_extent_half * 0.7 ], 
			// 	[ x_extent_half, -y_extent_half ], 
			// 	[ MathUtil.mix(-x_extent_half, x_extent_half, 0.66), 2.3 * -y_extent_half], 
			// 	[ -x_extent_half, -y_extent_half*.5 ] ];
			const path_pts = [ 
				[ -x_extent_half, y_extent_half ], 
				[ 0.25 * x_extent_half, y_extent_half*3.0 ], 
				[ x_extent_half, y_extent_half ], 
				[ x_extent_half, -y_extent_half ], 
				//[ 0, y_extent_half-0.1 ],
				[ -x_extent_half, -y_extent_half ] ];
			const mass = 0.0;
			//let ground_floor_go = this.go_mgr.addPolygonGameObject( path_pts, mass );
			let ground_floor_go = this.go_mgr.addPolygonGameObject_Breakable( 
				path_pts, 
				this.coordinator.sound_meta_obj.rock_destroy_alias, 
				() => {
					// make all those static wall pieces around the falling ram become dynamic and break away underneath the big broken stone
					this.damocles_wall_left_btm_go.rigid_body.recip_mass = 1.0 / SimulationParameters.rigidBodyDefaultMass();
					this.damocles_wall_left_btm_go.rigid_body.recip_inertia = 1.0 / this.damocles_wall_left_btm_go.rigid_body.calculateInertia();
					this.damocles_wall_left_btm_go.rigid_body.accel_vec2 = SimulationParameters.globalGravity();						

					this.damocles_wall_right_btm_go.rigid_body.recip_mass = 1.0 / SimulationParameters.rigidBodyDefaultMass();
					this.damocles_wall_right_btm_go.rigid_body.recip_inertia = 1.0 / this.damocles_wall_right_btm_go.rigid_body.calculateInertia();
					this.damocles_wall_right_btm_go.rigid_body.accel_vec2 = SimulationParameters.globalGravity();						
					
					this.damocles_left_floor_go.rigid_body.recip_mass = 1.0 / SimulationParameters.rigidBodyDefaultMass();
					this.damocles_left_floor_go.rigid_body.recip_inertia = 1.0 / this.damocles_left_floor_go.rigid_body.calculateInertia();
					this.damocles_left_floor_go.rigid_body.accel_vec2 = SimulationParameters.globalGravity();						

					this.damocles_right_floor_go.rigid_body.recip_mass = 1.0 / SimulationParameters.rigidBodyDefaultMass();
					this.damocles_right_floor_go.rigid_body.recip_inertia = 1.0 / this.damocles_right_floor_go.rigid_body.calculateInertia();
					this.damocles_right_floor_go.rigid_body.accel_vec2 = SimulationParameters.globalGravity();						
					
				}, 
				mass );
			ground_floor_go.setPos( new Vec2( 800.0, 1590.0 ) );
		}
		
		{ // damocles wall right top
			const x_extent_half = 25.0;
			const y_extent_half = 455.0;
			const path_pts = [
				[ -x_extent_half, y_extent_half-70 ], 
				[ x_extent_half, y_extent_half ], 
				[ x_extent_half, -y_extent_half ], 
				[ -x_extent_half, -y_extent_half ] ];
			const mass = 0.0;
			let damocles_wall_right_top_go = this.go_mgr.addPolygonGameObject( path_pts, mass );
			damocles_wall_right_top_go.setPos( new Vec2( 865, 600.0 ) );
		}
		{ // damocles wall right btm
			const x_extent_half = 25.0;
			const y_extent_half = 105.0;
			const path_pts = [
				[ -x_extent_half, y_extent_half ], 
				[ x_extent_half, y_extent_half ], 
				[ x_extent_half, -y_extent_half ], 
				[ -x_extent_half, -y_extent_half-70 ] ];
			const mass = 0.0;
			this.damocles_wall_right_btm_go = this.go_mgr.addPolygonGameObject( path_pts, mass );
			this.damocles_wall_right_btm_go.setPos( new Vec2( 865, 1155.0 ) );
		}
		
		

		{ // lower left slightly sloped wall at floor
			const x_extent_half = 60.0;
			const y_extent_half = 970.0;
			const path_pts = [ [ -x_extent_half, y_extent_half-100 ], [ x_extent_half, y_extent_half ], [ x_extent_half, -y_extent_half ], [ -x_extent_half, -y_extent_half-100 ] ];
			const mass = 0.0;
			let ground_floor_go = this.go_mgr.addPolygonGameObject( path_pts, mass );
			ground_floor_go.setPos( new Vec2( -380.0, 2170.0 ) );
			ground_floor_go.setAngle( Math.PI * -0.2 );
		}
		
		
		
		{ // last tunnel
			{ // tunnel el 1
				const x_extent_half = 100.0;
				const y_extent_half = 770.0;
				const path_pts = [ [ -x_extent_half, y_extent_half ], [ x_extent_half, y_extent_half ], [ x_extent_half, -y_extent_half ], [ -x_extent_half, -y_extent_half ] ];
				const mass = 0.0;
				let tunnel_element_go = this.go_mgr.addPolygonGameObject( path_pts, mass );
				tunnel_element_go.setPos( new Vec2( 4700.0, 3100.0 ) );
				tunnel_element_go.setAngle( Math.PI * 0.25 );
			}			
			{ // tunnel el 2
				const x_extent_half = 100.0;
				const y_extent_half = 740.0;
				const path_pts = [ [ -x_extent_half, y_extent_half ], [ x_extent_half, y_extent_half ], [ x_extent_half, -y_extent_half ], [ -x_extent_half, -y_extent_half ] ];
				const mass = 0.0;
				let tunnel_element_go = this.go_mgr.addPolygonGameObject( path_pts, mass );
				tunnel_element_go.setPos( new Vec2( 5700.0, 1980.0 ) );
				tunnel_element_go.setAngle( Math.PI * 0.22 );
			}			
			{ // tunnel el 3
				const x_extent_half = 100.0;
				const y_extent_half = 740.0;
				const path_pts = [ [ -x_extent_half, y_extent_half ], [ x_extent_half, y_extent_half ], [ x_extent_half, -y_extent_half ], [ -x_extent_half, -y_extent_half ] ];
				const mass = 0.0;
				let tunnel_element_go = this.go_mgr.addPolygonGameObject( path_pts, mass );
				tunnel_element_go.setPos( new Vec2( 6420.0, 700.0 ) );
				tunnel_element_go.setAngle( Math.PI * 0.1 );
			}
			{ // tunnel el 4
				const x_extent_half = 150.0;
				const y_extent_half = 780.0;
				const path_pts = [ [ -x_extent_half, y_extent_half ], [ x_extent_half, y_extent_half ], [ x_extent_half, -y_extent_half ], [ -x_extent_half, -y_extent_half ] ];
				const mass = 0.0;
				let tunnel_element_go = this.go_mgr.addPolygonGameObject( path_pts, mass );
				tunnel_element_go.setPos( new Vec2( 6750.0, -800.0 ) );
			}
			{ // tunnel el 5
				const x_extent_half = 150.0;
				const y_extent_half = 850.0;
				const path_pts = [ [ -x_extent_half, y_extent_half ], [ x_extent_half, y_extent_half ], [ x_extent_half, -y_extent_half ], [ -x_extent_half, -y_extent_half ] ];
				const mass = 0.0;
				let tunnel_element_go = this.go_mgr.addPolygonGameObject( path_pts, mass );
				tunnel_element_go.setPos( new Vec2( 6150.0, -2150.0 ) );
				tunnel_element_go.setAngle( Math.PI * -0.25 );
			}
			{ // tunnel el 6 roof final room
				const x_extent_half = 800.0;
				const y_extent_half = 150.0;
				const path_pts = [ [ -x_extent_half, y_extent_half ], [ x_extent_half, y_extent_half ], [ x_extent_half, -y_extent_half ], [ -x_extent_half, -y_extent_half ] ];
				const mass = 0.0;
				let tunnel_element_go = this.go_mgr.addPolygonGameObject( path_pts, mass );
				tunnel_element_go.setPos( new Vec2( 4800.0, -2700.0 ) );
			}
			{ // tunnel el 7 roof left-sloped final room
				const x_extent_half = 150.0;
				const y_extent_half = 850.0;
				const path_pts = [ [ -x_extent_half, y_extent_half ], [ x_extent_half, y_extent_half ], [ x_extent_half, -y_extent_half ], [ -x_extent_half, -y_extent_half ] ];
				const mass = 0.0;
				let tunnel_element_go = this.go_mgr.addPolygonGameObject( path_pts, mass );
				tunnel_element_go.setPos( new Vec2( 3500.0, -2100.0 ) );
				tunnel_element_go.setAngle( Math.PI * 0.25 );
			}
			{ // tunnel el 7 floor left-sloped final room
				const x_extent_half = 150.0;
				const y_extent_half = 850.0;
				const path_pts = [ [ -x_extent_half, y_extent_half ], [ x_extent_half, y_extent_half ], [ x_extent_half, -y_extent_half ], [ -x_extent_half, -y_extent_half ] ];
				const mass = 0.0;
				let tunnel_element_go = this.go_mgr.addPolygonGameObject( path_pts, mass );
				tunnel_element_go.setPos( new Vec2( 3500.0, -1100.0 ) );
				tunnel_element_go.setAngle( Math.PI * -0.25 );
			}			
			{ // tunnel el 7 roof left-sloped final room
				const x_extent_half = 150.0;
				const y_extent_half = 500.0;
				const path_pts = [ [ -x_extent_half, y_extent_half ], [ x_extent_half, y_extent_half ], [ x_extent_half, -y_extent_half ], [ -x_extent_half, -y_extent_half ] ];
				const mass = 0.0;
				let tunnel_element_go = this.go_mgr.addPolygonGameObject( path_pts, mass );
				tunnel_element_go.setPos( new Vec2( 3750.0, -180.0 ) );
				tunnel_element_go.setAngle( Math.PI * 0.15 );
			}
			
			{ // tunnel boulder hall final room
				{ // tunnel hall floor left final room
					const x_extent_half = 400.0;
					const y_extent_half = 40.0;
					const path_pts = [ [ -x_extent_half, y_extent_half ], [ x_extent_half, y_extent_half ], [ x_extent_half, -y_extent_half ], [ -x_extent_half, -y_extent_half ] ];
					const mass = 0.0;
					let tunnel_element_go = this.go_mgr.addPolygonGameObject( path_pts, mass );
					tunnel_element_go.setPos( new Vec2( 4205.0, -950.0 ) );
				}

				{ // tunnel hall floor left final room - opening
					const x_extent_half = 300.0;
					const y_extent_half = 40.0;
					const path_pts = [ 
						[ -x_extent_half, y_extent_half ], 
						[ x_extent_half-80.0, y_extent_half ], 
						//[ x_extent_half, -y_extent_half+y_extent_half*0.75 ], // notch
						[ x_extent_half, -y_extent_half+y_extent_half*0.1 ], // notch
						//[ x_extent_half, 0.0 ], // notch
						[ x_extent_half, -y_extent_half ], 
						[ -x_extent_half, -y_extent_half ] ];
					const mass = 0.0;
					let tunnel_element_go = this.go_mgr.addPolygonGameObject( path_pts, mass );
					tunnel_element_go.setPos( new Vec2( 4400.0, -650.0 ) );
				}
				{ // tunnel hall floor right final room - opening
					const x_extent_half = 140.0;
					const y_extent_half = 40.0;
					const path_pts = [ 
						[ -x_extent_half, -y_extent_half+y_extent_half*0.1 ], // notch
						//[ -x_extent_half, 0.0 ], // notch
						[ -x_extent_half+80, y_extent_half ], 
						[ x_extent_half, y_extent_half ], 
						[ x_extent_half, -y_extent_half ], 
						[ -x_extent_half, -y_extent_half ] ];
					const mass = 0.0;
					let tunnel_element_go = this.go_mgr.addPolygonGameObject( path_pts, mass );
					tunnel_element_go.setPos( new Vec2( 4855.0, -650.0 ) );
				}

				{ // tunnel hall floor right final room opening top
					const x_extent_half = 90.0;
					const y_extent_half = 40.0;
					const path_pts = [ 
						[ -x_extent_half, y_extent_half ], 
						[ x_extent_half, y_extent_half ], 
						[ x_extent_half, -y_extent_half-3 ], // prevent boulder from falling by itself
						[ -x_extent_half, -y_extent_half ] ];
					const mass = 0.0;
					let tunnel_element_go = this.go_mgr.addPolygonGameObject( path_pts, mass );
					tunnel_element_go.setPos( new Vec2( 4910.0, -950.0 ) );
				}

				{ // tunnel hall floor left ram shaft room
					const x_extent_half = 20.0;
					const y_extent_half = 100.0;
					const path_pts = [ [ -x_extent_half, y_extent_half ], [ x_extent_half, y_extent_half ], [ x_extent_half, -y_extent_half ], [ -x_extent_half, -y_extent_half ] ];
					const mass = 0.0;
					let tunnel_element_go = this.go_mgr.addPolygonGameObject( path_pts, mass );
					tunnel_element_go.setPos( new Vec2( 4575.0, -800.0 ) );
				}
				{ // tunnel hall floor right ram shaft room
					const x_extent_half = 20.0;
					const y_extent_half = 100.0;
					const path_pts = [ [ -x_extent_half, y_extent_half ], [ x_extent_half, y_extent_half ], [ x_extent_half, -y_extent_half ], [ -x_extent_half, -y_extent_half ] ];
					const mass = 0.0;
					let tunnel_element_go = this.go_mgr.addPolygonGameObject( path_pts, mass );
					tunnel_element_go.setPos( new Vec2( 4835.0, -800.0 ) );
				}
				
				{ // final dodge ram
					const x_extent_half = 155.0;
					const y_extent_half = 100.0;
					const path_pts = [
						[ -x_extent_half, y_extent_half ], 
						[ x_extent_half, y_extent_half ], 
						//[ x_extent_half + 0.25*x_extent_half, 0 ], 
						[ x_extent_half + 0.3*x_extent_half, 0 ], 
						[ x_extent_half, -y_extent_half ], 
						[ -x_extent_half, -y_extent_half ] ];
					//const mass = 0.0;
					let lvl_wall_prop = this.go_mgr.addPolygonGameObject( path_pts );
					lvl_wall_prop.setPos( new Vec2( 4750, -800 ) );	
					lvl_wall_prop.setAngle( Math.PI * -0.5 );
				}
				
				{ // Someday, when you are older, you could get hit by a boulder
					const radius = 500.0;
					const mass = 20.0;
					let test_circle_go = this.go_mgr.addCircleGameObject( radius, mass );
					test_circle_go.setPos( new Vec2(  4920.0, -950.0-radius ) );
				}
				
				// { // beneath boulder left
				// 	const x_extent_half = 495.0;
				// 	const y_extent_half = 40.0;
				// 	const path_pts = [ [ -x_extent_half, y_extent_half ], [ x_extent_half, y_extent_half ], [ x_extent_half-30, -y_extent_half ], [ -x_extent_half, -y_extent_half ] ];
				// 	const mass = 0.0;
				// 	this.beneath_boulder_left_go = this.go_mgr.addPolygonGameObject( path_pts, mass );
				// 	this.beneath_boulder_left_go.setPos( new Vec2( 5505.0, -560.0 ) );
				// 	this.beneath_boulder_left_go.setAngle( Math.PI * 0.05 );
				// }
				{ // beneath boulder left A
					const x_extent_half = 245.0;
					const y_extent_half = 40.0;
					const path_pts = [ [ -x_extent_half, y_extent_half ], [ x_extent_half, y_extent_half ], [ x_extent_half, -y_extent_half ], [ -x_extent_half, -y_extent_half ] ];
					const mass = 0.0;
					this.beneath_boulder_left_a_go = this.go_mgr.addPolygonGameObject( path_pts, mass );
					this.beneath_boulder_left_a_go.setPos( new Vec2( 5265.0, -610.0 ) );
					this.beneath_boulder_left_a_go.setAngle( Math.PI * 0.05 );
				}
				{ // beneath boulder left B
					const x_extent_half = 245.0;
					const y_extent_half = 40.0;
					const path_pts = [ [ -x_extent_half, y_extent_half ], [ x_extent_half, y_extent_half ], [ x_extent_half-30, -y_extent_half ], [ -x_extent_half, -y_extent_half ] ];
					const mass = 0.0;
					this.beneath_boulder_left_b_go = this.go_mgr.addPolygonGameObject( path_pts, mass );
					this.beneath_boulder_left_b_go.setPos( new Vec2( 5750.0, -530.0 ) );
					this.beneath_boulder_left_b_go.setAngle( Math.PI * 0.05 );
				}
				{ // beneath boulder right
					const x_extent_half = 305.0;
					const y_extent_half = 40.0;
					const path_pts = [ [ -x_extent_half, y_extent_half ], [ x_extent_half, y_extent_half ], [ x_extent_half, -y_extent_half ], [ -x_extent_half+20, -y_extent_half ] ];
					const mass = 0.0;
					this.beneath_boulder_right_go = this.go_mgr.addPolygonGameObject( path_pts, mass );
					this.beneath_boulder_right_go.setPos( new Vec2( 6290.0, -570.0 ) );
					this.beneath_boulder_right_go.setAngle( Math.PI * -0.08 );
				}
				{ // boulder floor breakable
					const x_extent_half = 848.0;
					const y_extent_half = 82.0;
					const path_pts = [ 
						[ -x_extent_half, y_extent_half ], 
						[ 0.25 * x_extent_half, y_extent_half*3.0 ], 
						[ x_extent_half, y_extent_half ], 
						[ x_extent_half, -y_extent_half ], 
						//[ 0, y_extent_half-0.1 ],
						[ -x_extent_half, -y_extent_half ] ];
					const mass = 0.0;
					//let ground_floor_go = this.go_mgr.addPolygonGameObject( path_pts, mass );
					let ground_floor_go = this.go_mgr.addPolygonGameObject_Breakable( 
						path_pts, 
						this.coordinator.sound_meta_obj.rock_destroy_alias, 
						() => {
							// make all those static wall pieces around the falling ram become dynamic and break away underneath the big broken stone
							this.beneath_boulder_left_a_go.rigid_body.recip_mass = 0.25 / SimulationParameters.rigidBodyDefaultMass();
							this.beneath_boulder_left_a_go.rigid_body.recip_inertia = 1.0 / this.beneath_boulder_left_a_go.rigid_body.calculateInertia();
							this.beneath_boulder_left_a_go.rigid_body.accel_vec2 = SimulationParameters.globalGravity();
							this.beneath_boulder_left_b_go.rigid_body.recip_mass = 0.25 / SimulationParameters.rigidBodyDefaultMass();
							this.beneath_boulder_left_b_go.rigid_body.recip_inertia = 1.0 / this.beneath_boulder_left_b_go.rigid_body.calculateInertia();
							this.beneath_boulder_left_b_go.rigid_body.accel_vec2 = SimulationParameters.globalGravity();
							this.beneath_boulder_right_go.rigid_body.recip_mass = 0.25 / SimulationParameters.rigidBodyDefaultMass();
							this.beneath_boulder_right_go.rigid_body.recip_inertia = 1.0 / this.beneath_boulder_right_go.rigid_body.calculateInertia();
							this.beneath_boulder_right_go.rigid_body.accel_vec2 = SimulationParameters.globalGravity();							
						}, 
						mass );
					ground_floor_go.setPos( new Vec2( 5790.0, -755.0 ) );
				}
				
				{ // Level Exit
					const x_extent_half = 100.0;
					const y_extent_half = 100.0;
					const path_pts = [ 
						[ -x_extent_half, y_extent_half ], 
						[ 1.15 * x_extent_half, y_extent_half ], 
						[ x_extent_half, y_extent_half*1.2 ], 
						[ x_extent_half, -y_extent_half ], 
						//[ 0, y_extent_half-0.1 ],
						[ -x_extent_half, -y_extent_half ] ];
					const mass = 0.0;
					let exit_go = this.go_mgr.addPolygonGameObject_Breakable( 
						path_pts, 
						this.coordinator.sound_meta_obj.rock_destroy_alias, 
						() => {
							const did_win = true;
							this.coordinator.gotoScene(new ResultScreen(this.coordinator, did_win, 9));
						}, 
						mass );
					exit_go.setPos( new Vec2( 3600.0, -1550.0 ) );
					
					const exit_label = new PIXI.Text('Level\nExit', inGameLabelStyle);
					exit_label.position.x -= 90;
					exit_label.position.y -= 80;
					
					exit_go.render_primitive.gfx_container.addChild( exit_label );
				}
			}
		}
		
		
		
		{ // two platforms over one another on the left cave wall
			{ // floor left with circles to drop on breakable floor below
				const x_extent_half = 200.0;
				const y_extent_half = 20.0;
				const path_pts = [ 
					[ -x_extent_half, y_extent_half * 1.1 ], 
					[ MathUtil.mix(-x_extent_half, x_extent_half, 0.77), 1.9 * y_extent_half], 
					[ x_extent_half, y_extent_half * 0.7 ], 
					[ x_extent_half, -y_extent_half ], 
					//[ MathUtil.mix(-x_extent_half, x_extent_half, 0.16), 2.1 * -y_extent_half], 
					[ -x_extent_half, -y_extent_half*.5 ] ];
				const mass = 0.0;
				let ground_floor_go = this.go_mgr.addPolygonGameObject( path_pts, mass );
				//ground_floor_go.setPos( new Vec2( -3150.0, 424.0 - 2.1 * y_extent_half ) );
				ground_floor_go.setPos( new Vec2( -3100.0, 824.0 - 2.1 * y_extent_half ) );
			}
			if ( true ) { // simple circle
				const radius = 60.0;
				const mass = 10.0;
				let test_circle_go = this.go_mgr.addCircleGameObject( radius, mass );
				test_circle_go.setPos( new Vec2( -3060.0, 200.0 ) );
			}
			if ( true ) { // simple circle
				const radius = 70.0;
				const mass = 10.0;
				let test_circle_go = this.go_mgr.addCircleGameObject( radius, mass );
				test_circle_go.setPos( new Vec2( -2980.0, 200.0 ) );
			}
			
			{ // floor left breakable
				const x_extent_half = 324.0;
				const y_extent_half = 50.0;
				const path_pts = [ 
					[ -x_extent_half, y_extent_half * 1.1 ], 
					[ MathUtil.mix(-x_extent_half, x_extent_half, 0.25), 1.9 * y_extent_half], 
					[ x_extent_half, y_extent_half * 0.7 ], 
					[ x_extent_half, -y_extent_half ], 
					[ MathUtil.mix(-x_extent_half, x_extent_half, 0.66), 2.3 * -y_extent_half], 
					[ -x_extent_half, -y_extent_half*.5 ] ];
				const mass = 0.0;
				//let ground_floor_go = this.go_mgr.addPolygonGameObject( path_pts, mass );
				let ground_floor_go = this.go_mgr.addPolygonGameObject_Breakable( path_pts, this.coordinator.sound_meta_obj.rock_destroy_alias, () => {}, mass );
				ground_floor_go.setPos( new Vec2( -2794.0, 1424.0 - 2.1 * y_extent_half ) );
			}
			
		}

/*
		{ // breakable 
			const mass = 0.0;
			const x_extent_half = 168;
			const y_extent_half = 64;
			
			let point_array2 = [];
			for ( let i = 0; i < 9; i++ ) {
				point_array2.push( [ ( Math.random() * 2.0 - 1.0 ) * x_extent_half, ( Math.random() * 2.0 - 1.0 ) * y_extent_half ] );
			}
			point_array2 = ConvexHull.makeHull( point_array2 );
			
			let test_shape_go = this.go_mgr.addPolygonGameObject_Breakable( point_array2, this.coordinator.sound_meta_obj.rock_destroy_alias, () => {}, mass );
			test_shape_go.setPos( new Vec2( 1500.0, -90.0 ) );
		}
		

		{ // breakable 
			const mass = 0.0;
			// const x_extent_half = 38;
			// const y_extent_half = 24;
			const x_extent_half = 168;
			const y_extent_half = 64;
			
			let point_array2 = [];
			for ( let i = 0; i < 14; i++ ) {
				point_array2.push( [ ( Math.random() * 2.0 - 1.0 ) * x_extent_half, ( Math.random() * 2.0 - 1.0 ) * y_extent_half ] );
			}
			point_array2 = ConvexHull.makeHull( point_array2 );
			//const point_array2 = [ [ -x_extent_half, -x_extent_half ], [ x_extent_half, -x_extent_half ], [ 0.0, y_extent_half ] ]; // triangle
			
			let test_shape_go = this.go_mgr.addPolygonGameObject_Breakable( point_array2, this.coordinator.sound_meta_obj.rock_destroy_alias, () => {}, mass );
			//test_shape_go.setPos( new Vec2( 600.0, 10.0 ) );
			test_shape_go.setPos( new Vec2( 400.0, 100.0 ) );
		}

		{ // breakable 
			const mass = 0.0;
			const x_extent_half = 168;
			const y_extent_half = 64;
			
			let point_array2 = [];
			for ( let i = 0; i < 10; i++ ) {
				point_array2.push( [ ( Math.random() * 2.0 - 1.0 ) * x_extent_half, ( Math.random() * 2.0 - 1.0 ) * y_extent_half ] );
			}
			point_array2 = ConvexHull.makeHull( point_array2 );
			
			let test_shape_go = this.go_mgr.addPolygonGameObject_Breakable( point_array2, this.coordinator.sound_meta_obj.rock_destroy_alias, () => {}, mass );
			test_shape_go.setPos( new Vec2( 600.0, -100.0 ) );
		}
*/		

		
		
		
		
		
		let debug_vis_constraint_area;
		
		this.softbody_constraints_to_animate = [];
		
		// ---------------------------------------
		{ // soft bodies
			let point_mass_radius = 10.0;
			
			// circle constraint
			//const particle_radius = 1.0; // TODO [ph]: or point_mass_radius ??? is it faster / agreed upong to assume radius == 1 ... check this!
			const particle_radius = point_mass_radius;
			//const sim_grid_dim = {w:1000.0, h:1000.0};
			let boundary_circle_center_x	= 800.0;
			let boundary_circle_center_y	= -500.0;
			let boundary_circle_radius	= 450.0;
			let circleAreaConstraint = new SoftBodySolver.SpringMassSolverConstraintCircle(  // TODO: 
				boundary_circle_center_x, 
				boundary_circle_center_y, 
				boundary_circle_radius,
				particle_radius );

			debug_vis_constraint_area = new PIXI.Graphics()
				.beginFill(0x22CC22, 0.15)
				.lineStyle({ width: 1, color: 0x333333, alignment: 0 })
				.drawCircle( boundary_circle_center_x, boundary_circle_center_y, boundary_circle_radius );
			this.go_mgr.gfx_static_debug_container.addChild( debug_vis_constraint_area );
			
			//this.softbody_constraints_to_animate.push( {origin: {x: boundary_circle_center_x, y: boundary_circle_center_y}, constraint: circleAreaConstraint, debug_vis_container: debug_vis_constraint_area} );
			this.circleAreaConstraint_soft_plank_container = debug_vis_constraint_area;
							
				
			// boundary_circle_center_x	= 2500.0;
			// boundary_circle_center_y	= 3000.0;
			// boundary_circle_radius	= 500.0;
			boundary_circle_center_x	= -760.0;
			boundary_circle_center_y	= 700.0;
			boundary_circle_radius	= 500.0;
			let circleAreaConstraint2 = new SoftBodySolver.SpringMassSolverConstraintCircle(  // TODO: 
				boundary_circle_center_x, 
				boundary_circle_center_y, 
				boundary_circle_radius,
				particle_radius );

			debug_vis_constraint_area = new PIXI.Graphics()
				.beginFill(0x22CC22, 0.15)
				.lineStyle({ width: 1, color: 0x333333, alignment: 0 })
				.drawCircle( boundary_circle_center_x, boundary_circle_center_y, boundary_circle_radius );
			//!!! this.go_mgr.gfx_static_debug_container.addChild( debug_vis_constraint_area ); // not needed, we see the rigid body circle directly 
			//!!!  additional anim for soft ball polygon
			this.softbody_constraints_to_animate.push( {origin: {x: boundary_circle_center_x, y: boundary_circle_center_y}, constraint: circleAreaConstraint2, debug_vis_container: debug_vis_constraint_area} );
			// # this should be used to make the soft ball move just with the rigid body, but looks cooler with additional anim... 
			// this.softbody_constraints_to_animate.push( {origin: {x: boundary_circle_center_x, y: boundary_circle_center_y}, constraint: undefined, debug_vis_container: undefined} );
			this.wiggle_constraint_RB = circleAreaConstraint2;
			
			// slope toward top right
			const plane_equ_normal_tpr_x = -1.0/Math.sqrt( 2.0 );
			const plane_equ_normal_tpr_y = -1.0/Math.sqrt( 2.0 );
			const pos_on_plane_tpr = { x: 300.0, y: -50.0 };
			const plane_equ_dist_to_origin_tpr = -( plane_equ_normal_tpr_x * pos_on_plane_tpr.x + plane_equ_normal_tpr_y * pos_on_plane_tpr.y );
			let fluidSolverPlane_tpr_Constraint = new ParticleBoundaryConstraintPlane( 
				point_mass_radius,
				{ x: plane_equ_normal_tpr_x, y: plane_equ_normal_tpr_y, z: plane_equ_dist_to_origin_tpr } );
				
			// slope toward top left
			const plane_equ_normal_tpl_x =  1.0/Math.sqrt( 2.0 );
			const plane_equ_normal_tpl_y = -1.0/Math.sqrt( 2.0 );
			const pos_on_plane_tpl = { x: -250.0, y: -350.0 };
			const plane_equ_dist_to_origin_tpl = -( plane_equ_normal_tpl_x * pos_on_plane_tpl.x + plane_equ_normal_tpl_y * pos_on_plane_tpl.y );
			let fluidSolverPlane_tpl_Constraint = new ParticleBoundaryConstraintPlane( 
				point_mass_radius,
				{ x: plane_equ_normal_tpl_x, y: plane_equ_normal_tpl_y, z: plane_equ_dist_to_origin_tpl } );
			
				
			this.soft_ball_outer_verts_gos = [];
				
			//const sb_friction = 0.925;
			const sb_friction = SimulationParameters.rigidBodyDefaultFriction();
			
			//const sb_restitution =  2.8; // not physically plausible, but still looks okay
			//const sb_restitution =  1.0;
			const sb_restitution = SimulationParameters.rigidBodyDefaultRestitution();
			
			// NOTE: due to hacky nature, any polygonal soft bodies must be specified first, while any non-polygonal soft bodies must be specified last
			if ( true ) { // soft ball FULL - with hacky rigid-body (and thus player) interaction
				const num_soft_body_balls_outer_subdivs  = 8;
				const ball_center = { x: 2800.0, y: 150.0 };
				
				//const ball_radius = 110.0;
				const ball_radius = 100.0;
				const mass = SimulationParameters.rigidBodyDefaultMass() * 0.1;
				
				const spring_mass_system_idx = this.soft_body_object_mgr.makeBall( ball_center, ball_radius, num_soft_body_balls_outer_subdivs, point_mass_radius, mass );
				let spring_mass_system = this.soft_body_object_mgr.getSoftBodySpringMassSystemAtIdx( spring_mass_system_idx );
				//spring_mass_system.addBoundaryConstraint( circleAreaConstraint );
				
				// polygon outline				
				let polygon_outline_vec2 = this.soft_body_object_mgr.getSoftBodyPolygonOutlineVec2AtIdx( spring_mass_system_idx );
				let polygon_outline_indcies = this.soft_body_object_mgr.getSoftBodyPolygonOutlineIndicesAtIdx( spring_mass_system_idx );

				let path_as_array_of_array2 = [];
				polygon_outline_vec2.forEach((el) => {
					path_as_array_of_array2.push( [ el.x, el.y ] );
				});
				
				
				const restitution = SimulationParameters.rigidBodyDefaultRestitution();
				const friction = SimulationParameters.rigidBodyDefaultFriction();
				let rigid_body = new RigidBody_Polygon(path_as_array_of_array2, mass, restitution, friction);

        		let bounding_circle = rigid_body.getBoundingCircle();

				let path_as_xy_sequence = [];
				polygon_outline_vec2.forEach((el) => {
					path_as_xy_sequence.push(el.x);
					path_as_xy_sequence.push(el.y);
				});
		
				const line_color = [1.0, 1.0, 1.0, 1.0];
				const fill_color = [0.2, 0.9, 0.7, 0.9];
				let render_primitive = new BuiltinRenderPrimitive_Polygon(path_as_xy_sequence, bounding_circle, line_color, fill_color);
		
				// hacky
				let new_sb_go = new GameObject( rigid_body, render_primitive );
				this.soft_body_object_mgr.soft_body_gos.push( new_sb_go );
				
				this.soft_body_object_mgr.softBodyContainer.addChild( render_primitive.gfx_container );
				

				// HACK - create a circule GameObject for each outline point, and then after the collision updates, transfer the positions back onto the soft body
				for ( let i = 0; i < polygon_outline_indcies.length; i++ ) {
					let particles = spring_mass_system.getParticles();
					let particle_idx = polygon_outline_indcies[i];
					const pt_vec2 = new Vec2( particles[particle_idx].position.x, particles[particle_idx].position.y )
					const radius = 35.0;
					//const mass = SimulationParameters.rigidBodyDefaultMass() / num_soft_body_balls_outer_subdivs;
					const mass_fract = mass / num_soft_body_balls_outer_subdivs;
					const friction = sb_friction; //SimulationParameters.rigidBodyDefaultFriction();
					const restitution = sb_restitution; //SimulationParameters.rigidBodyDefaultRestitution();
					let mass_point_go = this.go_mgr.addCircleGameObject( radius, mass_fract, restitution, friction );
					mass_point_go.setPos( pt_vec2 );
					//mass_point_go.render_primitive.gfx_container.visible = false;
					
					this.soft_ball_outer_verts_gos.push( {sms_idx: spring_mass_system_idx, particle_idx: particle_idx, mass_point_go: mass_point_go} );
				} //);
			}
				
				
				
			// NOTE: due to hacky nature, any polygonal soft bodies must be specified first, while any non-polygonal soft bodies must be specified last
			if ( false) { // soft plank FULL - with hacky rigid-body (and thus player) interaction
				//const plank_center = { x: 1300.0, y: 100.0 };
				//const plank_center = { x: 200.0, y: 500.0 };
				//const plank_center = { x: 300.0, y: 500.0 };
				const plank_center = { x: 1000.0, y: 450.0 };
				const plank_dim = { w: 380.0, h: 200.0 };
				const sub_divs = { x: 4, y: 2 };
				const spring_mass_system_idx = this.soft_body_object_mgr.makePlank( plank_center, plank_dim, sub_divs, point_mass_radius );
				let spring_mass_system = this.soft_body_object_mgr.getSoftBodySpringMassSystemAtIdx( spring_mass_system_idx );
			
				// polygon outline				
				let polygon_outline_vec2 = this.soft_body_object_mgr.getSoftBodyPolygonOutlineVec2AtIdx( spring_mass_system_idx );
				let polygon_outline_indcies = this.soft_body_object_mgr.getSoftBodyPolygonOutlineIndicesAtIdx( spring_mass_system_idx );

				let path_as_array_of_array2 = [];
				polygon_outline_vec2.forEach((el) => {
					path_as_array_of_array2.push( [ el.x, el.y ] );
				});
				
				const mass = SimulationParameters.rigidBodyDefaultMass() * 0.1;
				const restitution = SimulationParameters.rigidBodyDefaultRestitution();
				const friction = SimulationParameters.rigidBodyDefaultFriction();
				let rigid_body = new RigidBody_Polygon(path_as_array_of_array2, mass, restitution, friction);

        		let bounding_circle = rigid_body.getBoundingCircle();

				let path_as_xy_sequence = [];
				polygon_outline_vec2.forEach((el) => {
					path_as_xy_sequence.push(el.x);
					path_as_xy_sequence.push(el.y);
				});
		
				const line_color = [1.0, 1.0, 1.0, 1.0];
				const fill_color = [0.5, 0.9, 0.9, 0.9];
				let render_primitive = new BuiltinRenderPrimitive_Polygon(path_as_xy_sequence, bounding_circle, line_color, fill_color);
		
				// hacky
				let new_sb_go = new GameObject( rigid_body, render_primitive );
				this.soft_body_object_mgr.soft_body_gos.push( new_sb_go );
				
				this.soft_body_object_mgr.softBodyContainer.addChild( render_primitive.gfx_container );
				
				//console.log( `### there are ${polygon_outline_indcies.length} points in the plank outline` );
				
				for ( let i = 0; i < polygon_outline_indcies.length; i++ ) {
					let particles = spring_mass_system.getParticles();
					let particle_idx = polygon_outline_indcies[i];
					const pt_vec2 = new Vec2( particles[particle_idx].position.x, particles[particle_idx].position.y )
					const radius = 35.0;
					let mass = SimulationParameters.rigidBodyDefaultMass() / ( ( sub_divs.x + 0 ) * ( sub_divs.y + 0 ) );
					//if ( i == 0 ) { mass = 0.0 }
					const friction = sb_friction; //SimulationParameters.rigidBodyDefaultFriction();
					const restitution = sb_restitution; //SimulationParameters.rigidBodyDefaultRestitution();
					let mass_point_go = this.go_mgr.addCircleGameObject( radius, mass, restitution, friction );
					mass_point_go.setPos( pt_vec2 );
					
					this.soft_ball_outer_verts_gos.push( {sms_idx: spring_mass_system_idx, particle_idx: particle_idx, mass_point_go: mass_point_go} );
				}
			} //);
				
				

			{ // NOTE: due to hacky nature, any polygonal soft bodies must be specified first, while any non-polygonal soft bodies must be specified last
				// tentacles
				{
					const plank_center = { x: -2500.0, y: -2780.0 };
					const plank_dim = { w: 160.0, h: 450.0 };
					const sub_divs = { x: 1, y: 5 };
					const fix_side = 'TOP';
					this.addSoftPlankFixedMass(plank_center, plank_dim, sub_divs, fix_side, point_mass_radius, sb_friction, sb_restitution); //);
				}
				{
					const plank_center = { x: -2100.0, y: -2840.0 };
					const plank_dim = { w: 160.0, h: 350.0 };
					const sub_divs = { x: 1, y: 4 };								
					const fix_side = 'TOP';
					this.addSoftPlankFixedMass(plank_center, plank_dim, sub_divs, fix_side, point_mass_radius, sb_friction, sb_restitution); //);
				}
				{
					const plank_center = { x: -3300.0, y: -2380.0 };
					const plank_dim = { w: 220.0, h: 300.0 };
					const sub_divs = { x: 2, y: 3 };
					const fix_side = 'TOP';
					const offsets_vec2_fixed_mass_points = [ new Vec2( -60.0, -185.0 ), new Vec2( -40.0, -105.0 ), new Vec2( -20.0, -40.0 ) ]; // slightly slope it toward top right
					this.addSoftPlankFixedMass(plank_center, plank_dim, sub_divs, fix_side, point_mass_radius, sb_friction, sb_restitution, offsets_vec2_fixed_mass_points); //);
				}

				{
					const plank_center = { x: -3450.0, y: -1880.0 };
					const plank_dim = { w: 420.0, h: 200.0 };
					const sub_divs = { x: 4, y: 2 };
					const fix_side = 'LEFT';
					//const offsets_vec2_fixed_mass_points = [ new Vec2( -60.0, -185.0 ), new Vec2( -40.0, -105.0 ), new Vec2( -20.0, -40.0 ) ]; // slightly slope it toward top right
					this.addSoftPlankFixedMass(plank_center, plank_dim, sub_divs, fix_side, point_mass_radius, sb_friction, sb_restitution, /*offsets_vec2_fixed_mass_points*/); //);
				}
				
				{
					const plank_center = { x: -3130.0, y: -580.0 };
					const plank_dim = { w: 220.0, h: 200.0 };
					const sub_divs = { x: 3, y: 2 };
					const fix_side = 'LEFT';
					//const offsets_vec2_fixed_mass_points = [ new Vec2( -60.0, -185.0 ), new Vec2( -40.0, -105.0 ), new Vec2( -20.0, -40.0 ) ]; // slightly slope it toward top right
					this.addSoftPlankFixedMass(plank_center, plank_dim, sub_divs, fix_side, point_mass_radius, sb_friction, sb_restitution, /*offsets_vec2_fixed_mass_points*/); //);
				}
			}
				
			// NOTE: due to hacky nature, any polygonal soft bodies must be specified first, while any non-polygonal soft bodies must be specified last
			{ // soft ball - polygon, but no GameObject/Player interaction
				let point_mass_radius = 1.0;
				const num_soft_body_balls_outer_subdivs  = 9;
				//const num_soft_body_balls_outer_subdivs  = 8;
				//const ball_center = { x: 700.0, y: 170.0 };
				//const ball_center = { x: 2400.0, y: 2800.0 };
				const ball_center = { x: circleAreaConstraint2.circleBoundCenterX - circleAreaConstraint2.circleBoundRadius * 0.25, y: circleAreaConstraint2.circleBoundCenterY };
				
				//const ball_radius = 200.0;
				const ball_radius = 100.0;
				const spring_mass_system_idx = this.soft_body_object_mgr.makeBall( ball_center, ball_radius, num_soft_body_balls_outer_subdivs, point_mass_radius );
				let spring_mass_system = this.soft_body_object_mgr.getSoftBodySpringMassSystemAtIdx( spring_mass_system_idx );
				//spring_mass_system.addBoundaryConstraint( circleAreaConstraint );
				spring_mass_system.addBoundaryConstraint( circleAreaConstraint2 );
								
				// polygon outline				
				let polygon_outline_vec2 = this.soft_body_object_mgr.getSoftBodyPolygonOutlineVec2AtIdx( spring_mass_system_idx );
				//let polygon_outline_indcies = this.soft_body_object_mgr.getSoftBodyPolygonOutlineIndicesAtIdx( spring_mass_system_idx );

				let path_as_array_of_array2 = [];
				polygon_outline_vec2.forEach((el) => {
					path_as_array_of_array2.push( [ el.x, el.y ] );
				});
				
				const mass = SimulationParameters.rigidBodyDefaultMass();
				const restitution = SimulationParameters.rigidBodyDefaultRestitution();
				const friction = SimulationParameters.rigidBodyDefaultFriction();
				let rigid_body = new RigidBody_Polygon(path_as_array_of_array2, mass, restitution, friction);

				let bounding_circle = rigid_body.getBoundingCircle();

				let path_as_xy_sequence = [];
				polygon_outline_vec2.forEach((el) => {
					path_as_xy_sequence.push(el.x);
					path_as_xy_sequence.push(el.y);
				});
		
				const line_color = [1.0, 1.0, 1.0, 1.0];
				const fill_color = [0.1, 0.99, 0.85, 0.9];
				let render_primitive = new BuiltinRenderPrimitive_Polygon(path_as_xy_sequence, bounding_circle, line_color, fill_color);
		
				// hacky
				let new_sb_go = new GameObject( rigid_body, render_primitive );
				this.soft_body_object_mgr.soft_body_gos.push( new_sb_go );
				
				this.soft_body_object_mgr.softBodyContainer.addChild( render_primitive.gfx_container );

				{ // wiggle soft ball circle boundary rigid body
					// const radius = ball_radius;
					const radius = this.wiggle_constraint_RB.circleBoundRadius;
					const mass = 10.0;
					this.wiggleSoftBallPolygon_RB = this.go_mgr.addCircleGameObject( radius, mass );
					this.wiggleSoftBallPolygon_RB.setPos( new Vec2(  ball_center.x, ball_center.y ) );
				}
			}
			
			
				

			if ( true ) { //soft plank - polygon, but no GameObject/Player interaction
				let point_mass_radius = 1.0;
				//const plank_center = { x: 500.0, y: 500.0 };
				//const plank_center = { x: 650.0, y: 500.0 };
				
				const plank_center = { x: circleAreaConstraint.circleBoundCenterX, y: circleAreaConstraint.circleBoundCenterY };
				// circleAreaConstraint.circleBoundCenterX
				// circleAreaConstraint.circleBoundCenterY
				// circleAreaConstraint.circleBoundRadius
				
				
				
				const plank_dim = { w: 450.0, h: 120.0 }; 
				const sub_divs = { x: 4, y: 1 }; 
				const spring_mass_system_idx = this.soft_body_object_mgr.makePlank( plank_center, plank_dim, sub_divs, point_mass_radius );
				let spring_mass_system = this.soft_body_object_mgr.getSoftBodySpringMassSystemAtIdx( spring_mass_system_idx );
				spring_mass_system.addBoundaryConstraint( circleAreaConstraint );
				this.circleAreaConstraint_soft_plank = circleAreaConstraint;
				this.circleAreaConstraint_soft_plank_origin_vec2 = new Vec2(circleAreaConstraint.circleBoundCenterX, circleAreaConstraint.circleBoundCenterY);

				//this.circleAreaConstraint_soft_plank_container = debug_vis_constraint_area;
				
				// polygon outline				
				let polygon_outline_vec2 = this.soft_body_object_mgr.getSoftBodyPolygonOutlineVec2AtIdx( spring_mass_system_idx );

				let path_as_array_of_array2 = [];
				polygon_outline_vec2.forEach((el) => {
					path_as_array_of_array2.push( [ el.x, el.y ] );
				});
				
				const mass = SimulationParameters.rigidBodyDefaultMass();
				const restitution = SimulationParameters.rigidBodyDefaultRestitution();
				const friction = SimulationParameters.rigidBodyDefaultFriction();
				let rigid_body = new RigidBody_Polygon(path_as_array_of_array2, mass, restitution, friction);

				let bounding_circle = rigid_body.getBoundingCircle();

				let path_as_xy_sequence = [];
				polygon_outline_vec2.forEach((el) => {
					path_as_xy_sequence.push(el.x);
					path_as_xy_sequence.push(el.y);
				});
		
				const line_color = [1.0, 1.0, 1.0, 1.0];
				const fill_color = [0.1, 0.99, 0.85, 0.9];
				let render_primitive = new BuiltinRenderPrimitive_Polygon(path_as_xy_sequence, bounding_circle, line_color, fill_color);

				// hacky
				this.soft_body_object_mgr.soft_body_gos.push( new GameObject( rigid_body, render_primitive ) );

				this.soft_body_object_mgr.softBodyContainer.addChild( render_primitive.gfx_container );
			}
			
			
			
			
			// NOTE: due to hacky nature, any polygonal soft bodies must be specified first, while any non-polygonal soft bodies must be specified last
			if ( false ) { // soft ball - just mass points, no GO interaction
				let point_mass_radius = 12.0;
				const num_soft_body_balls_outer_subdivs  = 8;
				const ball_center = { x: 270.0, y: -520.0 };
				const ball_radius = 100.0;
				const spring_mass_system_idx = this.soft_body_object_mgr.makeBall( ball_center, ball_radius, num_soft_body_balls_outer_subdivs, point_mass_radius );
				let spring_mass_system = this.soft_body_object_mgr.getSoftBodySpringMassSystemAtIdx( spring_mass_system_idx );
				spring_mass_system.addBoundaryConstraint( circleAreaConstraint2 );
				//spring_mass_system.addBoundaryConstraint( fluidSolverPlane_tpr_Constraint );
				//!! spring_mass_system.addBoundaryConstraint( fluidSolverPlane_tpl_Constraint );
				
				// for this one, we will remove its links after some time
				this.sms_ball_to_be_unlinked = spring_mass_system;
			}
					
			if ( false ) { //soft plank - just mass points, no GameObject/Player interaction
				let point_mass_radius = 12.0;
				const plank_center = { x: -250.0, y: 300.0 };
				const plank_dim = { w: 150.0, h: 600.0 };
				const sub_divs = { x: 1, y: 4 };
				const spring_mass_system_idx = this.soft_body_object_mgr.makePlank( plank_center, plank_dim, sub_divs, point_mass_radius );
				let spring_mass_system = this.soft_body_object_mgr.getSoftBodySpringMassSystemAtIdx( spring_mass_system_idx );
				spring_mass_system.addBoundaryConstraint( circleAreaConstraint2 );

			}

					
		} // soft bodies
			
		
		// ---------------------------------------
		
		
		
		
		// housing for polygon soft ball and soft plank
		// circleAreaConstraint2.circleBoundCenterX
		// circleAreaConstraint2.circleBoundCenterY
		// circleAreaConstraint2.circleBoundRadius
		
		
		
		
		
		
		
		if ( this.use_crt_filter ) {
			//this.app.stage.filters = [ this.crtFilter ];
			this.container_main.filters = [ this.crtFilter ];
		}
		
		//container.filters = [ this.crtFilter ];
		//container.width  = app.screen.width;
		//container.height = app.screen.height;
		//container.filterArea = app.renderer.screen;

		
		
		
		
		
		
		
		let gos = this.go_mgr.getGameObjects();
		// for ( let i = 0; i < gos.length; i++ ) {
		// 	gos[i].render_primitive.addLabel( i );
		// }
		container.addChild( this.go_mgr.getGfxGameObjectContainer() );
		container.addChild( this.go_mgr.gfx_debug_container ); // add debug vis last, so it's always overlayed "on top of" the game objects
		container.addChild( this.go_mgr.gfx_static_debug_container ); // add debug vis last, so it's always overlayed "on top of" the game objects
	
		this.go_mgr.updateAllGameObjects( this.fixed_simulation_dt_msec * 0.001 ); // 1.0 / 60.0 initially

		// TODO: not using threads yet
		// run physics web worker
		//!!! this.startWebWorker();
  	}

	addSoftPlankFixedMass(plank_center, plank_dim, sub_divs, fix_side, point_mass_radius, sb_friction, sb_restitution, offsets_vec2_fixed_mass_points = [] ) {
		if (true) { // soft plank FULL fixed mass point - with hacky rigid-body (and thus player) interaction

			// offsets_vec2_fixed_mass_points = offsets_vec2_fixed_mass_points || [];
			
			// const plank_center = { x: -2500.0, y: -2780.0 };
			// const plank_dim = { w: 110.0, h: 500.0 };
			// const sub_divs = { x: 1, y: 6 };
			
			const mass = SimulationParameters.rigidBodyDefaultMass() * 0.1;
			const spring_mass_system_idx = this.soft_body_object_mgr.makePlank(plank_center, plank_dim, sub_divs, point_mass_radius, mass);
			let spring_mass_system = this.soft_body_object_mgr.getSoftBodySpringMassSystemAtIdx(spring_mass_system_idx);

			// polygon outline				
			let polygon_outline_vec2 = this.soft_body_object_mgr.getSoftBodyPolygonOutlineVec2AtIdx(spring_mass_system_idx);
			let polygon_outline_indcies = this.soft_body_object_mgr.getSoftBodyPolygonOutlineIndicesAtIdx(spring_mass_system_idx);

			let path_as_array_of_array2 = [];
			polygon_outline_vec2.forEach((el) => {
				path_as_array_of_array2.push([el.x, el.y]);
			});

			
			const restitution = SimulationParameters.rigidBodyDefaultRestitution();
			const friction = SimulationParameters.rigidBodyDefaultFriction();
			let rigid_body = new RigidBody_Polygon(path_as_array_of_array2, mass, restitution, friction);

			let bounding_circle = rigid_body.getBoundingCircle();

			let path_as_xy_sequence = [];
			polygon_outline_vec2.forEach((el) => {
				path_as_xy_sequence.push(el.x);
				path_as_xy_sequence.push(el.y);
			});

			const line_color = [1.0, 1.0, 1.0, 1.0];
			const fill_color = [0.2, 0.9, 0.7, 0.9];
			let render_primitive = new BuiltinRenderPrimitive_Polygon(path_as_xy_sequence, bounding_circle, line_color, fill_color);

			// hacky
			let new_sb_go = new GameObject(rigid_body, render_primitive);
			this.soft_body_object_mgr.soft_body_gos.push(new_sb_go);

			this.soft_body_object_mgr.softBodyContainer.addChild(render_primitive.gfx_container);

			let fixed_mass_points_visited = 0;
			//console.log( `### there are ${polygon_outline_indcies.length} points in the plank outline` );
			for (let i = 0; i < polygon_outline_indcies.length; i++) {
				let particles = spring_mass_system.getParticles();
				let particle_idx = polygon_outline_indcies[i];
				let pt_vec2 = new Vec2(particles[particle_idx].position.x, particles[particle_idx].position.y);
				const radius = 40.0;
				
				//let mass = SimulationParameters.rigidBodyDefaultMass() / ((sub_divs.x + 0) * (sub_divs.y + 0));
				let mass_fract = SimulationParameters.rigidBodyDefaultMass() / ((sub_divs.x + 0) * (sub_divs.y + 0));

				if ( fix_side == 'TOP' && i >= polygon_outline_indcies.length - 1 - sub_divs.x ) { 
					// fix top horitontal row
					mass_fract = 0.0; 
					
					if ( fixed_mass_points_visited < offsets_vec2_fixed_mass_points.length ) {
						pt_vec2.x += offsets_vec2_fixed_mass_points[fixed_mass_points_visited].x;
						pt_vec2.y += offsets_vec2_fixed_mass_points[fixed_mass_points_visited].y;
					}
					
					fixed_mass_points_visited++;
				} else if ( fix_side == 'BTM' &&  i >= sub_divs.y-2 + 1 && i <= sub_divs.y-2 + 1 + sub_divs.x ) { 
					// fix btm horizontal row .. a bit unstable, use only on very short planks with low vertical segment count
					mass_fract = 0.0;
				} else if ( fix_side == 'LEFT' && 
					//! ( i < sub_divs.y || i >= polygon_outline_indcies.length-1-1 ) // the other "-1" to give it one more mass point on top row to the right
					( i < sub_divs.y || i >= polygon_outline_indcies.length-1 ) // only left side
					) {
					mass_fract = 0.0;
				}
				
				
				const friction = sb_friction; 
				const restitution = sb_restitution; 

				let mass_point_go = this.go_mgr.addCircleGameObject(radius, mass_fract, restitution, friction);
				mass_point_go.setPos(pt_vec2);
				mass_point_go.render_primitive.gfx_container.visible = false;

				this.soft_ball_outer_verts_gos.push({ sms_idx: spring_mass_system_idx, particle_idx: particle_idx, mass_point_go: mass_point_go });
			}
		}
	}

	createParticleSystems() {
		{
			// NOTE: it is important that this particle system is the first particle system added, as it is linked to a breakable floo
			// NOTE: the circle-boundary constraint always needs to be the first constraint
			
			// const num_particles = 450;
			// const particle_radius = 22.0;
			const num_particles = 370;
			const particle_radius = 13.0;
			
			const emission_rate = 1.0;
			
			//const sim_grid_dim = { w: 2048.0, h: 2048.0 };
			const sim_grid_dim = { w: 1024.0, h: 1024.0 };
			//const sim_grid_dim = { w: 768.0, h: 768.0 };
			
			//const particle_sys_idx = this.ps_mgr.addParticleSystem(ParticleSystemType.circles, num_particles, particle_radius, sim_grid_dim);
			const particle_sys_idx = this.ps_mgr.addParticleSystem( ParticleSystemType.metaballs, num_particles, particle_radius, sim_grid_dim, emission_rate );
			//console.log( `particle_sys_idx = ${particle_sys_idx}` );
			let particle_sys = this.ps_mgr.getParticleSystemAtIdx(particle_sys_idx);
			
			particle_sys.fluidParticleGravityY = SimulationParameters.globalGravity().y * 0.0;
			
			//console.log( `particle_sys.particleFluidSolver.constraints.length = ${particle_sys.particleFluidSolver.constraints.length}` );
			
			//particle_sys.setCenterPos({ x: 380, y: -5100.0 });
			particle_sys.setCenterPos({ x: 180, y: -2530.0 });

			const radius = Math.min(particle_sys.sim_grid_dim.w, particle_sys.sim_grid_dim.h) * 0.48;
			// const center_x = particle_sys.sim_grid_dim.w * 0.25;
			const center_x = particle_sys.sim_grid_dim.w * 0.5;
			const center_y = particle_sys.sim_grid_dim.h * 0.5;
			this.fluidSolverCircleAreaConstraint = new ParticleBoundaryConstraintCircle(
				center_x,
				center_y,
				radius,
				particle_sys.particle_radius);
			particle_sys.addParticleSystemConstraint(this.fluidSolverCircleAreaConstraint);
			this.fluidSolverCircleAreaConstraint_original_center_vec2 = new Vec2( center_x, center_y );

			// let debug_vis_constraint_area = new PIXI.Graphics()
			// 	.beginFill(0xCCAA22, 0.15)
			// 	.lineStyle({ width: 1, color: 0x333333, alignment: 0 })
			// 	//.drawCircle( 800 - particle_sys.sim_grid_dim.w * 0.25, -200 + particle_sys.sim_grid_dim.h * 0.5, radius );
			// 	//.drawCircle( center_x + particle_sys.getCenterPos().x, -center_y + particle_sys.getCenterPos().y, radius );
			// 	//.drawCircle( center_x - 180, center_y - 220, radius * 0.5 );
			// 	//.drawCircle( center_x + 90, center_y - 610, radius * 0.5 );
			// 	.drawCircle( particle_sys.getCenterPos().x + radius/0.46, particle_sys.getCenterPos().y + radius/0.46*0.5, radius );
			// 	//.drawCircle( 800, -200, radius );
			// 	//.drawCircle( 0.0, 0.0, radius );
			// this.go_mgr.gfx_static_debug_container.addChild( debug_vis_constraint_area );
			if ( false ) { // wall on the right (normal toward left) particle system constraint
				const plane_equ_normal_x = -1.0;
				const plane_equ_normal_y = 0.0;
				const pos_on_plane = { x: 1400.0, y: 0.0 };
				const plane_equ_dist_to_origin = -(plane_equ_normal_x * pos_on_plane.x + plane_equ_normal_y * pos_on_plane.y);
				let fluidSolverPlaneConstraint = new ParticleBoundaryConstraintPlane(
					particle_sys.particle_radius,
					{ x: plane_equ_normal_x, y: plane_equ_normal_y, z: plane_equ_dist_to_origin });
				particle_sys.addParticleSystemConstraint(fluidSolverPlaneConstraint);
			}

			if ( false ) { // wall on the left (normal toward right) particle system constraint
				const plane_equ_normal_x = 1.0;
				const plane_equ_normal_y = 0.0;
				const pos_on_plane = { x: 400.0, y: 0.0 };
				const plane_equ_dist_to_origin = -(plane_equ_normal_x * pos_on_plane.x + plane_equ_normal_y * pos_on_plane.y);
				let fluidSolverPlaneConstraint = new ParticleBoundaryConstraintPlane(
					particle_sys.particle_radius,
					{ x: plane_equ_normal_x, y: plane_equ_normal_y, z: plane_equ_dist_to_origin });
				particle_sys.addParticleSystemConstraint(fluidSolverPlaneConstraint);
			}

			{ // wall on the bottom (normal toward up)
				const plane_equ_normal_x = 0.0;
				const plane_equ_normal_y = -1.0;
				//const pos_on_plane = { x: 0.0, y: 1170.0 };
				//const pos_on_plane = { x: 0.0, y: -sim_grid_dim.h * 0.5 };
				//const pos_on_plane = { x: 0.0, y: 680.0 };
				const pos_on_plane = { x: 0.0, y: sim_grid_dim.h * 0.6 };
				
				
				const plane_equ_dist_to_origin = -(plane_equ_normal_x * pos_on_plane.x + plane_equ_normal_y * pos_on_plane.y);
				let fluidSolverPlaneConstraint = new ParticleBoundaryConstraintPlane(
					particle_sys.particle_radius,
					{ x: plane_equ_normal_x, y: plane_equ_normal_y, z: plane_equ_dist_to_origin });
				particle_sys.addParticleSystemConstraint(fluidSolverPlaneConstraint);
			}

			//console.log( `particle_sys.particleFluidSolver.constraints.length = ${particle_sys.particleFluidSolver.constraints.length}` );
		}


		if ( true ) { // 2nd particle sys
			const num_particles = 350;
			const particle_radius = 15.0;
			const emission_rate = 2.0;
			const sim_grid_dim = { w: 1024.0, h: 1024.0 };
			//const particle_sys_idx = this.ps_mgr.addParticleSystem( ParticleSystemType.circles, num_particles, particle_radius, sim_grid_dim, emission_rate );
			const particle_sys_idx = this.ps_mgr.addParticleSystem(ParticleSystemType.metaballs, num_particles, particle_radius, sim_grid_dim, emission_rate);
			let particle_sys = this.ps_mgr.getParticleSystemAtIdx(particle_sys_idx);
			
			particle_sys.setCenterPos({ x: -1300, y: 250.0 });

			
			
			
			const radius = Math.min(particle_sys.sim_grid_dim.w, particle_sys.sim_grid_dim.h) * 0.49;
			// const center_x = particle_sys.sim_grid_dim.w * 0.25;
			const center_x = particle_sys.sim_grid_dim.w * 0.5;
			const center_y = particle_sys.sim_grid_dim.h * 0.5;
			this.fluidSolverCircleAreaConstraint2 = new ParticleBoundaryConstraintCircle(
				center_x,
				center_y,
				radius,
				particle_sys.particle_radius);
			particle_sys.addParticleSystemConstraint(this.fluidSolverCircleAreaConstraint2);
			this.fluidSolverCircleAreaConstraint2_original_center_vec2 = new Vec2( center_x, center_y );

			
			if ( false ) {
				
				{ // wall on the top (normal toward down)
					const plane_equ_normal_x = 0.0;
					const plane_equ_normal_y = 1.0;
					const pos_on_plane = { x: 0.0, y: -600.0 };
					const plane_equ_dist_to_origin = -(plane_equ_normal_x * pos_on_plane.x + plane_equ_normal_y * pos_on_plane.y);
					let fluidSolverPlaneConstraint = new ParticleBoundaryConstraintPlane(
						particle_sys.particle_radius,
						{ x: plane_equ_normal_x, y: plane_equ_normal_y, z: plane_equ_dist_to_origin });
					particle_sys.addParticleSystemConstraint(fluidSolverPlaneConstraint);
				}

				{ // slope toward top right
					const plane_equ_normal_x = -1.0 / Math.sqrt(2.0);
					const plane_equ_normal_y = -1.0 / Math.sqrt(2.0);
					const pos_on_plane = { x: 1800.0, y: 1550.0 };
					const plane_equ_dist_to_origin = -(plane_equ_normal_x * pos_on_plane.x + plane_equ_normal_y * pos_on_plane.y);
					let fluidSolverPlaneConstraint = new ParticleBoundaryConstraintPlane(
						particle_sys.particle_radius,
						{ x: plane_equ_normal_x, y: plane_equ_normal_y, z: plane_equ_dist_to_origin });
					particle_sys.addParticleSystemConstraint(fluidSolverPlaneConstraint);
				}

				{ // slope toward top left
					const plane_equ_normal_x = 1.0 / Math.sqrt(2.0);
					const plane_equ_normal_y = -1.0 / Math.sqrt(2.0);
					const pos_on_plane = { x: -0.0, y: 550.0 };
					const plane_equ_dist_to_origin = -(plane_equ_normal_x * pos_on_plane.x + plane_equ_normal_y * pos_on_plane.y);
					let fluidSolverPlaneConstraint = new ParticleBoundaryConstraintPlane(
						particle_sys.particle_radius,
						{ x: plane_equ_normal_x, y: plane_equ_normal_y, z: plane_equ_dist_to_origin });
					particle_sys.addParticleSystemConstraint(fluidSolverPlaneConstraint);
				}
			}
			//console.log( `particle_sys.particleFluidSolver.constraints.length = ${particle_sys.particleFluidSolver.constraints.length}` );
		}
	}

	createParticleSystemDelayed() { // 2nd particle sys
		const num_particles = 300;
		const particle_radius = 12.0;
		const emission_rate = 2.0;
		const sim_grid_dim = { w: 800.0, h: 800.0 };
		//const particle_sys_idx = this.ps_mgr.addParticleSystem( ParticleSystemType.circles, num_particles, particle_radius, sim_grid_dim, emission_rate );
		const particle_sys_idx = this.ps_mgr.addParticleSystem(ParticleSystemType.metaballs, num_particles, particle_radius, sim_grid_dim, emission_rate);
		let particle_sys = this.ps_mgr.getParticleSystemAtIdx(particle_sys_idx);
		
		particle_sys.setCenterPos({ x: 380, y: -900.0 });
		
		const radius = Math.min(particle_sys.sim_grid_dim.w, particle_sys.sim_grid_dim.h) * 0.49;
		// const center_x = particle_sys.sim_grid_dim.w * 0.25;
		const center_x = particle_sys.sim_grid_dim.w * 0.5;
		const center_y = particle_sys.sim_grid_dim.h * 0.5;
		this.fluidSolverCircleAreaConstraint = new ParticleBoundaryConstraintCircle(
			center_x,
			center_y,
			radius,
			particle_sys.particle_radius);
		particle_sys.addParticleSystemConstraint(this.fluidSolverCircleAreaConstraint);
		this.fluidSolverCircleAreaConstraint_original_center_vec2 = new Vec2( center_x, center_y );
		
	}
	
	onResize() {
		console.error( `got resize event` );
	}
	
	handleInput( clamped_dt_in_sec ) {
		
		//let time_factor = this.curr_dt_in_msec/this.fixed_simulation_dt_msec;
		let time_factor = clamped_dt_in_sec;
		
		let active_game_object_idx = this.player_ship_go_idx;
		let translation_speed = this.translation_speed * time_factor;
		let rotation_radians_speed = this.rotation_radians_speed * time_factor;
	
		// https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/keyCode	
		if ( this.keys[37] ) { 
			//console.log( `arrow left` ); 
			let selected_go = this.go_mgr.getGameObjects()[ active_game_object_idx ];
			selected_go.rigid_body.applyAngularVelocity( -rotation_radians_speed );
			
			if ( !PIXI.sound.find(this.coordinator.sound_meta_obj.small_thrust_alias).isPlaying ) {
				//PIXI.sound.volume( this.coordinator.sound_meta_obj.small_thrust_alias, 0.25 );
				PIXI.sound.play(this.coordinator.sound_meta_obj.small_thrust_alias, {loop: false});
			}			
			
		}
		if ( this.keys[39] ) { 
			//console.log( `arrow right` ); 
			let selected_go = this.go_mgr.getGameObjects()[ active_game_object_idx ];
			selected_go.rigid_body.applyAngularVelocity( rotation_radians_speed );
			
			if ( !PIXI.sound.find(this.coordinator.sound_meta_obj.small_thrust_alias).isPlaying ) {
				//PIXI.sound.volume( this.coordinator.sound_meta_obj.small_thrust_alias, 0.25 );
				PIXI.sound.play(this.coordinator.sound_meta_obj.small_thrust_alias, {loop: false});
			}			
			
		}
		if ( this.keys[38] ) {
			//console.log( `arrow up` ); },
			let selected_go = this.go_mgr.getGameObjects()[ active_game_object_idx ];
			//selected_go.applyLinearVelocity( {x: 0.0, y: -translation_speed} );
			const rot_mat = Mat2x3.createRotation( selected_go.getAngle() );
			//let translation_vec2 = Mat2x3.mulDirVector( rot_mat, {x: 0.0, y: -translation_speed * this.curr_dt_in_msec/this.fixed_simulation_dt_msec}  );
			let translation_vec2 = Mat2x3.mulDirVector( rot_mat, {x: 0.0, y: -translation_speed}  );
			selected_go.applyLinearVelocity( translation_vec2 );
			
			if ( !PIXI.sound.find(this.coordinator.sound_meta_obj.main_thrust_alias).isPlaying ) {
				//PIXI.sound.volume( this.coordinator.sound_meta_obj.main_thrust_alias, 0.75 );
				PIXI.sound.play(this.coordinator.sound_meta_obj.main_thrust_alias, {loop: false});
			}			

		}
		if ( this.keys[40] ) { 
			// 		//console.log( `arrow down` ); 
			let selected_go = this.go_mgr.getGameObjects()[ active_game_object_idx ];
			const rot_mat = Mat2x3.createRotation( selected_go.getAngle() );
			let translation_vec2 = Mat2x3.mulDirVector( rot_mat, {x: 0.0, y: translation_speed * 0.5}  );
			selected_go.applyLinearVelocity( translation_vec2 );
			
			if ( !PIXI.sound.find(this.coordinator.sound_meta_obj.main_thrust_alias).isPlaying ) {
				//PIXI.sound.volume( this.coordinator.sound_meta_obj.main_thrust_alias, 0.75 );					
				PIXI.sound.play(this.coordinator.sound_meta_obj.main_thrust_alias, {loop: false});
			}			
			
		}
		if ( this.keys[65] ) { // 'a'
			let selected_go = this.go_mgr.getGameObjects()[ active_game_object_idx ];
			const rot_mat = Mat2x3.createRotation( selected_go.getAngle() );
			let translation_vec2 = Mat2x3.mulDirVector( rot_mat, {x: -translation_speed * 0.45, y: 0.0}  );
			selected_go.applyLinearVelocity( translation_vec2 );			
			
			if ( !PIXI.sound.find(this.coordinator.sound_meta_obj.small_thrust_alias).isPlaying ) {
				//PIXI.sound.volume( this.coordinator.sound_meta_obj.small_thrust_alias, 0.25 );
				PIXI.sound.play(this.coordinator.sound_meta_obj.small_thrust_alias, {loop: false});
			}						
		}
		if ( this.keys[68] ) { // 'd'
			let selected_go = this.go_mgr.getGameObjects()[ active_game_object_idx ];
			const rot_mat = Mat2x3.createRotation( selected_go.getAngle() );
			let translation_vec2 = Mat2x3.mulDirVector( rot_mat, {x: translation_speed * 0.45, y: 0.0}  );
			selected_go.applyLinearVelocity( translation_vec2 );					
			
			if ( !PIXI.sound.find(this.coordinator.sound_meta_obj.small_thrust_alias).isPlaying ) {
				//PIXI.sound.volume( this.coordinator.sound_meta_obj.small_thrust_alias, 0.25 );
				PIXI.sound.play(this.coordinator.sound_meta_obj.small_thrust_alias, {loop: false});
			}						
		}	
	}
	
	onUpdate(delta_frames_of_target_frame_rate, dt_in_msec) {
		this.elapsed_target_frame_rate_frames += delta_frames_of_target_frame_rate;
		
		this.accum_elapsed_msec += dt_in_msec;
		this.curr_dt_in_msec = dt_in_msec;
		
		let clamped_dt_in_sec = dt_in_msec * 0.001;
		clamped_dt_in_sec = Math.min( clamped_dt_in_sec, this.max_simulation_dt_in_sec );
		this.handleInput( clamped_dt_in_sec );
		
		//const simulation_time_step_mode = 0; // frame-rate dependent fixed dt; => correct image, but not frame-rate independent
		const simulation_time_step_mode = 1; // use_varying_dt_step; => not a problem in this level, as 100% determinism isn't needed 
		//const simulation_time_step_mode = 2; // fixed_dt_frame_rate_independent_step => correct image, but very stuttery
		
		if ( simulation_time_step_mode == 0 ) {
			this.stepSimulation( this.fixed_simulation_dt_msec * 0.001 ); // advance sim time by desired fixed dt
		} else if ( simulation_time_step_mode == 1 ) {
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

		
		if ( this.start_add_ps_delay_ticks > 0 ) {
			this.start_add_ps_delay_ticks--;
			if ( this.start_add_ps_delay_ticks == 0 ) {
				console.log( `create ps delayed!` );
				this.createParticleSystemDelayed();
				this.animate_circleAreaConstraint_soft_plank = true;
				
				this.damocles_ram_go.rigid_body.recip_mass = 1.0 / SimulationParameters.rigidBodyDefaultMass();
				this.damocles_ram_go.rigid_body.recip_inertia = 1.0 / this.damocles_ram_go.rigid_body.calculateInertia();
				this.damocles_ram_go.rigid_body.accel_vec2 = SimulationParameters.globalGravity();
	
			}
		}
	}
	
	stepSimulation(dt_in_sec) {
		
		
		// get reply from web worker
		// this.physicsWorker.onmessage = (e) => {
		// 	// TODO: AM - how to properly update this? at the moment it is like: update whatever you get
		// 	if (e.data.update && (e.data.time >= this.prevPhysicsUpdateTime)){
		// 		this.prevPhysicsUpdateTime = e.data.time;
		// 		// update
		// 		let selected_go = this.go_mgr.getGameObjects()[ this.player_ship_go_idx ];
		// 		selected_go.rigid_body.applyLinearVelocity( e.data.linear_vel );
		// 		selected_go.rigid_body.applyAngularVelocity( e.data.angular_vel );
		// 	}
		// }
		
		
		if ( this.use_crt_filter ) {
			this.crtFilter.uniforms.u_time = this.elapsed_target_frame_rate_frames*0.021;
		}

		
		if ( 	this.curr_window_w != this.app.screen.width ||
				this.curr_window_h != this.app.screen.height ) {

			this.exitText.x = 0.5 * this.app.screen.width;
				
			if ( this.use_crt_filter ) {
				this.crtFilter.uniforms.u_rDim = {x: 1.0/this.app.screen.width, y: 1.0/this.app.screen.height};
				this.crtFilter.uniforms.u_dim = {x: this.app.screen.width, y: this.app.screen.height};
			}
			
			const scr_dim = { w: this.app.screen.width, h: this.app.screen.height };
			
			if ( this.use_particles ) {
					
				// this.particleContainer.scale = container_scale;
				// this.particleContainer.position.set( scr_dim.w * 0.5, scr_dim.h * 0.5 );
				// this.particleContainer.pivot.set( 0.5 * this.sim_grid_dim.w, 0.5 * this.sim_grid_dim.h );
				const pos = { x: scr_dim.w * 0.5, y: scr_dim.h * 0.5 };	
				this.ps_mgr.updateContainerSizes( scr_dim, pos );
			}
			
			this.container.position.set( scr_dim.w * 0.5, scr_dim.h * 0.5 );
			this.container.width  = app.screen.width;
			this.container.height = app.screen.height;
			
			
			this.curr_window_w = this.app.screen.width;
			this.curr_window_h = this.app.screen.height;
		}
	
		// ParticleSystemMgr
		if ( this.use_particles ) {
			this.updateAllParticleSystems( dt_in_sec );
		}

		{
			const num_sub_steps = 2.0;	
			this.soft_body_object_mgr.updateDriver( dt_in_sec, num_sub_steps );
		}
		
		for ( let sm_idx = 0; sm_idx < this.soft_body_object_mgr.soft_body_objects.length; sm_idx++ ) {
			
			//let polygon_outline_vec2 = this.soft_body_object_mgr.getSoftBodyPolygonOutlineVec2AtIdx( this.test_spring_mass_system_idx );
			let polygon_outline_vec2 = this.soft_body_object_mgr.getSoftBodyPolygonOutlineVec2AtIdx( sm_idx );
			
			let path_as_xy_sequence = [];
			polygon_outline_vec2.forEach((el) => {
				path_as_xy_sequence.push(el.x);
				path_as_xy_sequence.push(el.y);
			});		
			const line_width = 1.0;
			//this.test_render_primitive.gfxPolygonFromPoints( path_as_xy_sequence, line_width );
			// hacky
			if ( sm_idx < this.soft_body_object_mgr.soft_body_gos.length ) {
				this.soft_body_object_mgr.soft_body_gos[ sm_idx ].render_primitive.gfxPolygonFromPoints( path_as_xy_sequence, line_width );
			}

		}

		
		//this.softbody_constraints_to_animate.push( {origin: {x: boundary_circle_center_x, y: boundary_circle_center_y}, constraint: circleAreaConstraint2, debug_vis_container: debug_vis_constraint_area} );
		
		if ( this.softbody_constraints_to_animate_delay_ticks <= 0 ) {
			this.softbody_constraints_to_animate.forEach( (data) => {

				let origin = data.origin;
				let constraint = data.constraint;
				let container = data.debug_vis_container;
			
				if ( this.softbody_constraints_to_animate_strength < 50.0 ) {
					this.softbody_constraints_to_animate_strength += 0.22;
				}
				
				let radius = this.softbody_constraints_to_animate_strength;
				let c = Math.cos(this.elapsed_target_frame_rate_frames * 0.08) * radius;
				let s = Math.sin(this.elapsed_target_frame_rate_frames * 0.08) * radius;
				
				if ( constraint != undefined ) {
				constraint.circleBoundCenterX = origin.x + c;
				constraint.circleBoundCenterY = origin.y + s;
				
				//!!! constraint.circleBoundCenterX = this.wiggleSoftBallPolygon_RB.getPos().x;
				//!!! constraint.circleBoundCenterY = this.wiggleSoftBallPolygon_RB.getPos().y;

				container.position.x = c;
				container.position.y = s;
				//!!! container.position.x = -container.position.x + constraint.circleBoundCenterX;
				//!!! container.position.y = -container.position.y + constraint.circleBoundCenterY;
				}
				
				// only wiggle X
				this.fluidSolverCircleAreaConstraint2.circleBoundCenterX = 
					this.fluidSolverCircleAreaConstraint2_original_center_vec2.x + c;
				// this.fluidSolverCircleAreaConstraint2.circleBoundCenterY = 
				// 	this.fluidSolverCircleAreaConstraint2_original_center_vec2.y + s;
				
				//this.fluidSolverCircleAreaConstraint2.circleBoundCenterX = this.fluidSolverCircleAreaConstraint2_RB.getPos().x;
				//this.fluidSolverCircleAreaConstraint2.circleBoundCenterY = this.fluidSolverCircleAreaConstraint2_RB.getPos().y;
				

				c = Math.cos(this.elapsed_target_frame_rate_frames * 0.17) * radius * 0.75;
				s = Math.sin(this.elapsed_target_frame_rate_frames * 0.17) * radius * 0.75;

				// only wiggle X
				this.fluidSolverCircleAreaConstraint.circleBoundCenterX = 
					this.fluidSolverCircleAreaConstraint_original_center_vec2.x + c;
				
				// this.fluidSolverCircleAreaConstraint.circleBoundCenterY = 
				// 	this.fluidSolverCircleAreaConstraint_original_center_vec2.y + s;
					
			} );
		} else {
			this.softbody_constraints_to_animate_delay_ticks--;
		}
		
		{ // wiggle soft ball polygon
			let constraint = this.wiggle_constraint_RB;
			constraint.circleBoundCenterX = this.wiggleSoftBallPolygon_RB.getPos().x;
			constraint.circleBoundCenterY = this.wiggleSoftBallPolygon_RB.getPos().y;

			// we are drawing the rigid body already, no need for a debug container vis	
			// container.position.x = -container.position.x + constraint.circleBoundCenterX;
			// container.position.y = -container.position.y + constraint.circleBoundCenterY;
		}
		
		if ( this.animate_circleAreaConstraint_soft_plank ) {
			let radius = 50.0;
			let c = Math.cos(this.elapsed_target_frame_rate_frames * 0.08) * radius;
			let s = Math.sin(this.elapsed_target_frame_rate_frames * 0.08) * radius;
			this.circleAreaConstraint_soft_plank

			this.circleAreaConstraint_soft_plank_container.position.x = c;
			this.circleAreaConstraint_soft_plank_container.position.y = s;
			
			this.circleAreaConstraint_soft_plank.circleBoundCenterX = 
				this.circleAreaConstraint_soft_plank_origin_vec2.x + c;
			this.circleAreaConstraint_soft_plank.circleBoundCenterY = 
				this.circleAreaConstraint_soft_plank_origin_vec2.y + s;
		}
		
		this.go_mgr.updateAllGameObjects( dt_in_sec );
		
		//this.soft_ball_outer_verts_gos.push( {sms_idx: spring_mass_system_idx, particle_idx: particle_idx, mass_point_gogo: mass_point_go} );
		this.soft_ball_outer_verts_gos.forEach( (data) => { //{sms_idx: spring_mass_system_idx, particle_idx: particle_idx, mass_point_go: mass_point_go} );
			let spring_mass_system = this.soft_body_object_mgr.getSoftBodySpringMassSystemAtIdx( data.sms_idx );
			let particles = spring_mass_system.getParticles();
			let curr_particle = particles[ data.particle_idx ];
			
			let diff_pos_x = data.mass_point_go.getPos().x - curr_particle.position.x;
			let diff_pos_y = data.mass_point_go.getPos().y - curr_particle.position.y;
			
			//let force_x = 1600.0 * diff_pos_x;
			//let force_y = 1600.0 * diff_pos_y;
			let force_x = 2600.0 * diff_pos_x;
			let force_y = 2600.0 * diff_pos_y;			
			
			//if ( MathUtil.isApproxEqual( data.mass_point_go.rigid_body.recip_mass, 0.0 ) ) {
			if ( data.mass_point_go.rigid_body.recip_mass > 0.0 ) {
				if ( force_x > 0.0 ) { force_x = Math.min( force_x,  40000.0 ); }
				if ( force_x < 0.0 ) { force_x = Math.max( force_x, -40000.0 ); }
				if ( force_y > 0.0 ) { force_y = Math.min( force_y,  40000.0 ); }
				if ( force_y < 0.0 ) { force_y = Math.max( force_y, -40000.0 ); }
			}
			
			// if ( MathUtil.isApproxEqual( data.mass_point_go.rigid_body.recip_mass, 0.0 ) ) {
			// 	curr_particle.setPos( data.mass_point_go.getPos() );
			// 	curr_particle.setForce( new Vec2( 0.0, 0.0 ) );
			// } else {
				curr_particle.addForce( new Vec2( force_x, force_y ) );
			// }
			// curr_particle.lastPosX = curr_particle.position.x;
			// curr_particle.lastPosY = curr_particle.position.y;
			
			// curr_particle.position.x = data.mass_point_go.getPos().x;
			// curr_particle.position.y = data.mass_point_go.getPos().y;
			
			if ( data.mass_point_go.rigid_body.recip_mass > 0.0 ) {
				//data.mass_point_go.setPos( new Vec2( curr_particle.position.x, curr_particle.y ) );
				data.mass_point_go.setPos( new Vec2( 
					MathUtil.mix(curr_particle.position.x, data.mass_point_go.getPos().x, 0.3 ), 
					MathUtil.mix(curr_particle.position.y, data.mass_point_go.getPos().y, 0.3 ) ) );
				//data.mass_point_go.applyLinearVelocity( new Vec2( -10.0 * diff_pos_x, -10.0 * diff_pos_y ) );
			} else {
				//curr_particle.setForce( new Vec2( 0.0, 0.0 ) );
			}
			
		} );
		
		{ // follow the player
			const player_go = this.go_mgr.getGameObjects()[ this.player_ship_go_idx ];
			const player_pos = player_go.getPos();
			const cam_follow_strength = 0.06;
			
			// const diff_vec_x = ( player_pos.x - app.stage.pivot.x );
			// const diff_vec_y = ( player_pos.y - app.stage.pivot.y );
			const diff_vec_x = ( player_pos.x - this.container.pivot.x );
			const diff_vec_y = ( player_pos.y - this.container.pivot.y );
			
			const follow_dir_x = cam_follow_strength * diff_vec_x;
			const follow_dir_y = cam_follow_strength * diff_vec_y;
			
			// app.stage.pivot.x += follow_dir_x;
			// app.stage.pivot.y += follow_dir_y;
			this.container.pivot.x += follow_dir_x;
			this.container.pivot.y += follow_dir_y;
			
			if ( this.enable_cam_zooming ) {
				//let stage_scale = 1.0 - player_go.rigid_body.vel_vec2.len() * 0.01;
				//let stage_scale = 0.5;
				// const min_scale = 0.45; // zoomed out
				// const max_scale = 0.625; // zoomed in
				const min_scale = 0.22; // zoomed out
				const max_scale = this.cam_zoomed_in_factor; // zoomed in
				const scale_mix_factor = MathUtil.clamp( player_go.rigid_body.vel_vec2.len() * 0.001, 0.0, 1.0 );
				const stage_scale = MathUtil.mix( min_scale, max_scale, 1.0 - scale_mix_factor );
				
				if ( this.current_cam_zoom_factor == undefined ) {
					this.current_cam_zoom_factor = stage_scale;
				} else {
					this.current_cam_zoom_factor = MathUtil.mix( this.current_cam_zoom_factor, stage_scale, 0.1 );
				}
				
				//app.stage.scale.set( this.current_cam_zoom_factor );
				this.container.scale.set( this.current_cam_zoom_factor );
			} else {
				//this.container.scale.set( 0.625 );
				this.container.scale.set( this.cam_zoomed_in_factor );
			}
			
			// this.bg_parallax_sprite.position.x = 0.9*app.stage.pivot.x;
			// this.bg_parallax_sprite.position.y = 0.9*app.stage.pivot.y;
			this.bg_parallax_sprite.position.x = 0.9 * this.container.pivot.x;
			this.bg_parallax_sprite.position.y = 0.9 * this.container.pivot.y;
			
		}

	}
		
	updateAllParticleSystems( dt_in_sec ) {
		
		this.ps_mgr.updateAllParticleSystems( dt_in_sec );

		//console.log( `this.ps_mgr.particle_systems.length = ${this.ps_mgr.particle_systems.length}` );
		
		let ps = this.ps_mgr.getParticleSystemAtIdx(0);

		// let particles fall freely once they have all been spawned (after small delay)
		//if (ps.activeFluidParticles >= ps.num_particles ) {
		if ( ps != null && this.trigger_particle_fade ) {
			//if ( this.constraint_remove_start_delay_ticks > 0 ) {
			//	this.constraint_remove_start_delay_ticks--;
			//	if ( this.constraint_remove_start_delay_ticks <= 0 ) {
			//		ps.particleFluidSolver.constraints = [];	
			//	}
			//} else {
				this.destroy_particles_delay_ticks--;
				
				ps.particleFluidSolver.getFluidParticles().forEach( (p) => {
					p.alpha *= 0.992;
				} );
				
				if ( this.destroy_particles_delay_ticks <= 0 ) {
					ps.particleFluidSolver.setActiveParticleCount( 0 );
					while(ps.particleContainer.children[0]) { 
						ps.particleContainer.removeChild(ps.particleContainer.children[0]);
					}
			
					// attention, will mess up any indices stored to particle systems AFTER the just removed particle system!!!
					this.ps_mgr.removeParticleSystemAtIdx(0);
				}
			//}
		}

		
	}	

  	onFinish() {

		this.keyObject_esc.unsubscribe();
		
		while(this.container.children[0]) { 
			this.container.removeChild(this.container.children[0]);
		}

		this.bg_ambient_sound.stop();
		
		this.background_music.stop();
		this.coordinator.sound_meta_obj.background_music.play();
		
		return;
		
		//this.app.stage.filters = [];
		this.container_main.filters = [];
		
		this.physicsWorker.terminate();
		console.log("Terminated web worker")
	}

	startWebWorker() {
		return;
		
		// run physics web worker
		this.physicsWorker = new Worker('../js/WorkerLevel9.js');
		// send message to worker to start it
		this.physicsWorker.postMessage({
			update: true,
			//selected_go: this.go_mgr.getGameObjects()[ this.player_ship_go_idx ],
			
			angle_rad: this.go_mgr.getGameObjects()[ this.player_ship_go_idx ].getAngle(),
			document: 	new Blob(document),
			window: 	new Blob(window),
		});
	}
}
