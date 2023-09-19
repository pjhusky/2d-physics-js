"use strict";

class GameplayLevel7 {

	// static random = MathUtil.DeterministicRandom2().mulberry32;
	static random = MathUtil.DeterministicRandom.mulberry32;
	
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
		this.use_crt_filter = true;
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
		this.current_cam_zoom_factor = undefined;

		this.gfx_utils = new GfxUtils( this.app );
		//this.springMassSystems = [];
		this.soft_body_object_mgr = new SoftBodyObjectMgr( this.app, this.gfx_utils ); // 2nd arg is optional
		
		//this.softBodyContainer = new PIXI.Container();
		//this.softBodyContainer = null;

		
		this.bg_parallax_sprite = PIXI.Sprite.from( '../assets/glowing_blue.jpg' );
		this.bg_parallax_sprite.scale.set(2.5);
		this.bg_parallax_sprite.anchor.set( 0.5, 0.5 );
		
		this.sceneMapTex = undefined;
		this.sceneMapTexSprite = undefined;
		this.texRT = undefined;
		
		
		this.use_particles = true;
		
		this.ps_mgr = undefined;
									
		this.constraint_remove_start_delay_ticks = 120;
		this.destroy_particles_delay_ticks = 380;
		this.softbody_constraints_to_animate_delay_ticks = 380;
		this.softbody_constraints_to_animate_strength = 0.0;
		
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
		
		// this.document.addEventListener("keyup", (event) => {
		// 	const key_name = event.key;
		// 	if ( key_name == "Escape" ) {
		// 	}
		// });
		// let keyObject_esc = AppUtils.keyboard( "Escape" ); 
		// keyObject_esc.release = async () => {
		// 	//key object released
		// 	if ( !this.coordinator.currentScene instanceof Menu ) {
		// 		this.coordinator.gotoScene(new Menu(this.coordinator));	
		// 	}
		// };
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
		
		
    	// Add this to all levels ----------------
		
		let container = new PIXI.Container();
		let container_GUI = new PIXI.Container();
		container_main.addChild( container );
		container_main.addChild( container_GUI );
		
		this.container = container;
		this.container_main = container_main;
		
		// Level 7 info text
		this.levelInfo = new PIXI.Text('Level 6', levelInfoStyle);
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
				//() => {GameplayLevel7.muteThrustSound(key_code);}, // works, too!
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
					let translation_vec2 = Mat2x3.mulDirVector( rot_mat, {x: 0.0, y: -translation_speed}  );
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
			( this.fixed_simulation_dt_msec * 0.001 ) ); 
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
			
			player_go.setPos( new Vec2( 570.0, 290.0 ) ); // good setting for checking circle broad-phase vs. narrow phase collision with polygon
			player_go.setAngle( 0.1 );
			
			this.player_ship_go_idx = this.go_mgr.game_objects.length - 1;
			this.go_mgr.setPlayerGameObjectIndex( this.player_ship_go_idx );
		}
		{ // floor
			const x_extent_half = 2024.0 * 0.47;
			const y_extent_half = 50.0;
			const path_pts = [ [ -x_extent_half, y_extent_half ], [ x_extent_half, y_extent_half ], [ x_extent_half, -y_extent_half ], [ -x_extent_half, -y_extent_half ] ];
			const mass = 0.0;
			let ground_floor_go = this.go_mgr.addPolygonGameObject( path_pts, mass );
			ground_floor_go.setPos( new Vec2( 0.0 * 0.5, 1424.0 - 2.1 * y_extent_half ) );
		}
		{ // right slope
			const x_extent_half = 600.0;
			const y_extent_half = 50.0;
			const path_pts = [ [ -x_extent_half, y_extent_half ], [ x_extent_half, y_extent_half ], [ x_extent_half, -y_extent_half ], [ -x_extent_half, -y_extent_half ] ];
			const mass = 0.0;
			let ground_floor_go = this.go_mgr.addPolygonGameObject( path_pts, mass );
			ground_floor_go.setPos( new Vec2( 1500.0, 950.0 ) );
			ground_floor_go.setAngle( Math.PI * 0.83 );
		}
		{ // left slope
			const x_extent_half = 600.0;
			const y_extent_half = 50.0;
			const path_pts = [ [ -x_extent_half, y_extent_half ], [ x_extent_half, y_extent_half ], [ x_extent_half, -y_extent_half ], [ -x_extent_half, -y_extent_half ] ];
			const mass = 0.0;
			let ground_floor_go = this.go_mgr.addPolygonGameObject( path_pts, mass );
			ground_floor_go.setPos( new Vec2( -1500.0, 950.0 ) );
			ground_floor_go.setAngle( -Math.PI * 0.83 );
		}

		// { // breakable 
		// 	const mass = 0.0;
		// 	const x_extent_half = 168;
		// 	const y_extent_half = 64;
			
		// 	let point_array2 = [];
		// 	for ( let i = 0; i < 9; i++ ) {
		// 		point_array2.push( [ ( Math.random() * 2.0 - 1.0 ) * x_extent_half, ( Math.random() * 2.0 - 1.0 ) * y_extent_half ] );
		// 	}
		// 	point_array2 = ConvexHull.makeHull( point_array2 );
			
		// 	let test_shape_go = this.go_mgr.addPolygonGameObject_Breakable( point_array2, this.coordinator.sound_meta_obj.rock_destroy_alias, () => {}, mass );
		// 	test_shape_go.setPos( new Vec2( 1500.0, -90.0 ) );
		// }
		

		// { // breakable 
		// 	const mass = 0.0;
		// 	// const x_extent_half = 38;
		// 	// const y_extent_half = 24;
		// 	const x_extent_half = 168;
		// 	const y_extent_half = 64;
			
		// 	let point_array2 = [];
		// 	for ( let i = 0; i < 14; i++ ) {
		// 		point_array2.push( [ ( Math.random() * 2.0 - 1.0 ) * x_extent_half, ( Math.random() * 2.0 - 1.0 ) * y_extent_half ] );
		// 	}
		// 	point_array2 = ConvexHull.makeHull( point_array2 );
		// 	//const point_array2 = [ [ -x_extent_half, -x_extent_half ], [ x_extent_half, -x_extent_half ], [ 0.0, y_extent_half ] ]; // triangle
			
		// 	let test_shape_go = this.go_mgr.addPolygonGameObject_Breakable( point_array2, this.coordinator.sound_meta_obj.rock_destroy_alias, () => {}, mass );
		// 	//test_shape_go.setPos( new Vec2( 600.0, 10.0 ) );
		// 	test_shape_go.setPos( new Vec2( 400.0, 100.0 ) );
		// }

		// { // breakable 
		// 	const mass = 0.0;
		// 	const x_extent_half = 168;
		// 	const y_extent_half = 64;
			
		// 	let point_array2 = [];
		// 	for ( let i = 0; i < 10; i++ ) {
		// 		point_array2.push( [ ( Math.random() * 2.0 - 1.0 ) * x_extent_half, ( Math.random() * 2.0 - 1.0 ) * y_extent_half ] );
		// 	}
		// 	point_array2 = ConvexHull.makeHull( point_array2 );
			
		// 	let test_shape_go = this.go_mgr.addPolygonGameObject_Breakable( point_array2, this.coordinator.sound_meta_obj.rock_destroy_alias, () => {}, mass );
		// 	test_shape_go.setPos( new Vec2( 600.0, -100.0 ) );
		// }
		
		for (  let i = 0; i < 9; i++ ) { // breakables
			const mass = 0.0;
			
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
			
			let test_shape_go = this.go_mgr.addPolygonGameObject_Breakable( point_array2, this.coordinator.sound_meta_obj.rock_destroy_alias, () => {}, mass );
			
			const rand_val_D_m1p1 = ( Math.random() * 2.0 - 1.0 );
			const rand_val_E_m1p1 = ( Math.random() * 2.0 - 1.0 );
			const pos_x = -600 + rand_val_D_m1p1 * 1600;
			const pos_y = -700 + rand_val_E_m1p1 * 600;
			test_shape_go.setPos( new Vec2( pos_x, pos_y ) );			
		}
		
		for ( let i = 0; i < 9; i++ ) { // circles
			
			//const radius = 50.0;
			const rand_val_A_m1p1 = ( Math.random() * 2.0 - 1.0 );
			const radius = 50.0 + rand_val_A_m1p1 * 15.0;
			
			const rand_val_B_m1p1 = ( Math.random() * 2.0 - 1.0 );
			const mass = SimulationParameters.rigidBodyDefaultMass() + rand_val_B_m1p1 * 5.0;
			let test_circle_go = this.go_mgr.addCircleGameObject( radius, mass );
			
			const rand_val_C_m1p1 = ( Math.random() * 2.0 - 1.0 );
			const pos_x = 90 + rand_val_C_m1p1 * 300.0;
			const rand_val_D_m1p1 = ( Math.random() * 2.0 - 1.0 );
			const pos_y = 490 + rand_val_D_m1p1 * 250.0;
			
			//test_circle_go.setPos( new Vec2( 1290, 50 ) );
			test_circle_go.setPos( new Vec2( pos_x, pos_y ) );
		}

		
		for (  let i = 0; i < 5; i++ ) { // polygons
			
			const rand_val_A_m1p1 = ( Math.random() * 2.0 - 1.0 );
			const x_extent_half = 160 + rand_val_A_m1p1 * 34;
			
			const rand_val_B_m1p1 = ( Math.random() * 2.0 - 1.0 );
			const y_extent_half = 84 + rand_val_B_m1p1 * 32;
			
			const rand_val_C_m1p1 = ( Math.random() * 2.0 - 1.0 );
			let point_array2 = [];
			for ( let i = 0; i < 8 + Math.floor( rand_val_C_m1p1 * 5 + 0.5 ); i++ ) {
				point_array2.push( [ ( Math.random() * 2.0 - 1.0 ) * x_extent_half, ( Math.random() * 2.0 - 1.0 ) * y_extent_half ] );
			}
			point_array2 = ConvexHull.makeHull( point_array2 );
			
			const rand_val_D_m1p1 = ( Math.random() * 2.0 - 1.0 );
			const mass = SimulationParameters.rigidBodyDefaultMass() + rand_val_D_m1p1 * 5.0;
			
			let test_shape_go = this.go_mgr.addPolygonGameObject( point_array2, mass );
			
			const rand_val_E_m1p1 = ( Math.random() * 2.0 - 1.0 );
			const rand_val_F_m1p1 = ( Math.random() * 2.0 - 1.0 );
			const pos_x =  400 + rand_val_E_m1p1 * 600;
			const pos_y =  300 + rand_val_F_m1p1 * 270;
			test_shape_go.setPos( new Vec2( pos_x, pos_y ) );			
		}
		
		
		
		
		let debug_vis_constraint_area;
		
		
		
		if ( this.use_crt_filter ) {
			//this.app.stage.filters = [ this.crtFilter ];
			this.container_main.filters = [ this.crtFilter ];
		}
		
		
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

	createParticleSystems() {
		{
			const num_particles = 800;
			const particle_radius = 14.0;

			const sim_grid_dim = { w: 2048.0, h: 2048.0 };
			//const sim_grid_dim = { w: 1024.0, h: 1024.0 };
			
			//const particle_sys_idx = this.ps_mgr.addParticleSystem(ParticleSystemType.circles, num_particles, particle_radius, sim_grid_dim);
			const particle_sys_idx = this.ps_mgr.addParticleSystem( ParticleSystemType.metaballs, num_particles, particle_radius, sim_grid_dim );
			//console.log( `particle_sys_idx = ${particle_sys_idx}` );
			let particle_sys = this.ps_mgr.getParticleSystemAtIdx(particle_sys_idx);
			//console.log( `particle_sys.particleFluidSolver.constraints.length = ${particle_sys.particleFluidSolver.constraints.length}` );
			//this.ps_mgr.setCenterPos( {x:2400, y: 200.0}, 0 );
			particle_sys.setCenterPos({ x: 800, y: -200.0 });

			const radius = Math.min(particle_sys.sim_grid_dim.w, particle_sys.sim_grid_dim.h) * 0.46;
			const center_x = particle_sys.sim_grid_dim.w * 0.25;
			const center_y = particle_sys.sim_grid_dim.h * 0.5;
			let fluidSolverCircleAreaConstraint = new ParticleBoundaryConstraintCircle(
				center_x,
				center_y,
				radius,
				particle_sys.particle_radius);
			particle_sys.addParticleSystemConstraint(fluidSolverCircleAreaConstraint);



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
			{ // wall on the right (normal toward left)
				const plane_equ_normal_x = -1.0;
				const plane_equ_normal_y = 0.0;
				const pos_on_plane = { x: 1400.0, y: 0.0 };
				const plane_equ_dist_to_origin = -(plane_equ_normal_x * pos_on_plane.x + plane_equ_normal_y * pos_on_plane.y);
				let fluidSolverPlaneConstraint = new ParticleBoundaryConstraintPlane(
					particle_sys.particle_radius,
					{ x: plane_equ_normal_x, y: plane_equ_normal_y, z: plane_equ_dist_to_origin });
				particle_sys.addParticleSystemConstraint(fluidSolverPlaneConstraint);
			}

			{ // wall on the left (normal toward right)
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
				const pos_on_plane = { x: 0.0, y: 1300.0 };
				const plane_equ_dist_to_origin = -(plane_equ_normal_x * pos_on_plane.x + plane_equ_normal_y * pos_on_plane.y);
				let fluidSolverPlaneConstraint = new ParticleBoundaryConstraintPlane(
					particle_sys.particle_radius,
					{ x: plane_equ_normal_x, y: plane_equ_normal_y, z: plane_equ_dist_to_origin });
				particle_sys.addParticleSystemConstraint(fluidSolverPlaneConstraint);
			}

			//console.log( `particle_sys.particleFluidSolver.constraints.length = ${particle_sys.particleFluidSolver.constraints.length}` );
		}


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
		
		this.go_mgr.updateAllGameObjects( dt_in_sec );
		

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
				const min_scale = 0.3; // zoomed out
				const max_scale = 0.45; // zoomed in
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
				//app.stage.scale.set( 0.7 );
				//this.container.scale.set( 0.625 );
				this.container.scale.set( 0.45 );
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
		if (ps.activeFluidParticles >= ps.num_particles ) {
			if ( this.constraint_remove_start_delay_ticks > 0 ) {
				this.constraint_remove_start_delay_ticks--;
				if ( this.constraint_remove_start_delay_ticks <= 0 ) {
					ps.particleFluidSolver.constraints = [];	
				}
			} else {
				this.destroy_particles_delay_ticks--;
				
				ps.particleFluidSolver.getFluidParticles().forEach( (p) => {
					p.alpha *= 0.999;
				} );
				
				if ( this.destroy_particles_delay_ticks <= 0 ) {
					ps.particleFluidSolver.setActiveParticleCount( 0 );
					while(ps.particleContainer.children[0]) { 
						ps.particleContainer.removeChild(ps.particleContainer.children[0]);
					}
			
				}
			}
		}

		
	}	

  	onFinish() {

		this.keyObject_esc.unsubscribe();
		
		while(this.container.children[0]) { 
			this.container.removeChild(this.container.children[0]);
		}

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
		this.physicsWorker = new Worker('../js/WorkerLevel7.js');
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
