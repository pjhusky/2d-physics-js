/*eslint no-unused-vars: "warn"*/
"use strict";

// import * as PIXI from './pixijs/pixi.js';
// import { Vec2 } from './vec2.js';
// import { MathUtil } from './mathUtil.js';
// import { SimulationParameters } from './simulationParameters.js';
// import { Collisions } from './collisions.js';
// import { ShapeType } from './shapeType.js';
// import { GameObject, GameObject_Breakable } from './gameObject.js';
// import { RigidBody_Circle, RigidBody_Polygon } from './rigidBody.js';
// import { BuiltinRenderPrimitive_Circle, BuiltinRenderPrimitive_Polygon } from './builtinRenderPrimitive.js';

//export
class GameObjectMgr {
    constructor() {
        this.game_objects = [];
        this.gfx_debug_container = new PIXI.Container();
        this.gfx_static_debug_container = new PIXI.Container();
        this.gfx_game_object_container = new PIXI.Container();
        this.delay_add_game_objects = [];
        
        this.show_debug_vis = false;
        this.setDebugVisibility( this.show_debug_vis );
        
        this.player_game_object_idx = 0;
        this.collision_sound_aliases = [];
    }
    
    getGameObjects() { return this.game_objects; }
    getGfxGameObjectContainer() { return this.gfx_game_object_container; }
    
    setCollisionSoundAliases( sound_aliases ) {
        //sound_aliases.forEach( (sa) => {
        //    this.collision_sound_aliases.push( sa );
        //} );
        this.collision_sound_aliases = sound_aliases;
    }
    
    setPlayerGameObjectIndex( idx ) {
        this.player_game_object_idx = idx;
    }
    
    updateAllGameObjects( dt ) {
        
        // search for dead game objects
        let dead_go_refs = []
        this.game_objects.forEach( (go) => { if ( go.destroy_self == true ) { dead_go_refs.push( go ); } } );
        dead_go_refs.forEach( (go_ref) => { this.removeGameObject( go_ref ) } );
        
        if ( this.delay_add_game_objects.length > 0 ) {
            let delay_add_go_idx = 0;
            console.log( `there are ${this.delay_add_game_objects} delay-gos to add` );
            this.delay_add_game_objects.forEach( (go_info) => {
                
                console.log( `delay add game object '${delay_add_go_idx}' ` ); delay_add_go_idx++;
                
                let new_go = this.addPolygonGameObject( go_info.path, go_info.mass, go_info.restitution, go_info.friction );
                new_go.setPos( go_info.pos_vec2 );
                
            } );
            this.delay_add_game_objects = [];
        }
        
        
        while(this.gfx_debug_container.children[0]) { 
            this.gfx_debug_container.removeChild(this.gfx_debug_container.children[0]);
        }
        
        this.game_objects.forEach( (go) => { go.update( dt ); } );
        let collisions_detected_set = this.calculateAndDrawCollisionInfo( this.game_objects );
        collisions_detected_set.forEach( ( go_idx ) => { this.game_objects[ go_idx ].onCollide(); } );
        
        this.collisionDetectionWithResolve( this.game_objects );
        
        //console.log( `vel go 0: ${this.game_objects[0].rigid_body.vel_vec2}` );
    }
    
    collisionDetectionWithResolve( game_objects ) {
        
        const player_go = game_objects[ this.player_game_object_idx ];
        
        const max_relaxations = SimulationParameters.globalMaxPenetrationRelaxationIterations();
        for ( let relaxation_counter = 0; relaxation_counter < max_relaxations; relaxation_counter++ ) {
            // basically the collision function again, but without extra gfx-vis for debugging
            for ( let i = 0; i < game_objects.length; i++ ) {
                for ( let j = i + 1; j < game_objects.length; j++ ) {
                    const [ did_narrow_phase_collide, did_broad_phase_collide, collision_info ] = Collisions.collideShapes( game_objects[i].rigid_body, game_objects[j].rigid_body );
                    
                    if ( did_narrow_phase_collide ) 
                    {
                        const is_collision_with_player = ( i == this.player_game_object_idx || j == this.player_game_object_idx );
                        if ( ( is_collision_with_player && player_go.rigid_body.vel_vec2.lenSquared() > 3000.0 ) ||  
                             ( Vec2.distSquared( game_objects[i].rigid_body.pos_vec2, player_go.rigid_body.pos_vec2 ) < 800000.0 && 
                                 (  game_objects[i].rigid_body.vel_vec2.lenSquared() > 6000.0 || 
                                    game_objects[j].rigid_body.vel_vec2.lenSquared() > 6000.0  ) ) 
                        ) {
                            //const sound_alias_idx = Math.floor( Math.random() * this.collision_sound_aliases.length + 0.5 ) % this.collision_sound_aliases.length;
                            const sound_alias_idx = is_collision_with_player ? 
                                0 :
                                Math.floor( Math.random() * this.collision_sound_aliases.length ) % ( this.collision_sound_aliases.length - 1 ) + 1;
                            //const sound_alias_idx = 1;
                            const collision_sound_alias = this.collision_sound_aliases[ sound_alias_idx ];
                            let collision_sound = PIXI.sound.find( collision_sound_alias );
                            if ( !collision_sound.isPlaying ) {
                                const collision_sound_len = collision_sound.duration;
                                const rand_val = Math.random();
                                let rand_start = MathUtil.clamp( rand_val * (collision_sound_len - 2.0), 0.0, collision_sound_len );
                                let rand_end   = MathUtil.clamp( rand_val * (collision_sound_len - 2.0) + 1.0, 0.0, collision_sound_len );
                                if ( rand_start >= rand_end ) {
                                    if ( rand_end >= collision_sound_len ) {
                                        rand_start -= 1.0;
                                        rand_start = MathUtil.clamp( rand_start, 0.0, collision_sound_len );
                                    } else {
                                        rand_end += 1.0;
                                        rand_end = MathUtil.clamp( rand_end, 0.0, collision_sound_len );
                                    }
                                }
                                PIXI.sound.play( collision_sound_alias, {loop: false, start: rand_start, end: rand_end});
                            }
                        }
                        
                        // collision normal must always point from first object to second - flip now if that's not the case
                        // otherwise the following collision responses result in weird mixed unstable attracting/repelling behavior!
                        if ( Vec2.dot( collision_info.normal, Vec2.sub( game_objects[j].rigid_body.pos_vec2, game_objects[i].rigid_body.pos_vec2 ) ) < 0.0 ) {
                            collision_info.normal = Vec2.mulScalar( collision_info.normal, -1.0 );
                        }

                        // > only resolve penetrations, but allow for some slack - super fun bouncy mode :-)
                        //this.penetrationRelaxationSlack( game_objects[i].rigid_body, game_objects[j].rigid_body, collision_info );

                        // > proper collision response, apply linear momentum only
                        // this.collisionResponse_linearMomentumOnly( game_objects[i].rigid_body, game_objects[j].rigid_body, collision_info );
                        
                        // > full collision response with linear- and angular momentum
                        //this.collisionResponse_full( game_objects[i].rigid_body, game_objects[j].rigid_body, collision_info ); // works
                        //this.collisionResponse_withRotationNoFriction( game_objects[i].rigid_body, game_objects[j].rigid_body, collision_info ); // works
                        this.collisionResponse_withRotationAndFriction( game_objects[i].rigid_body, game_objects[j].rigid_body, collision_info );
                    }
                }
            }
        }
    }
    
    penetrationRelaxationSlack( rb1, rb2, penetration_info ) {
        if ( !SimulationParameters.globalPerformPenetrationRelaxation() ) { return; }
        
        if ( MathUtil.isApproxEqual( rb1.recip_mass, 0.0 ) && MathUtil.isApproxEqual( rb2.recip_mass, 0.0 ) ) { return; }
        
        //const relaxation_factor = 2.0 / (SimulationParameters.globalMaxPenetrationRelaxationIterations() * 0.9);
        const relaxation_factor = 2.0 / (SimulationParameters.globalMaxPenetrationRelaxationIterations() * 1.1);
        
        const correction_amount = penetration_info.depth / ( rb1.recip_mass + rb2.recip_mass ) * relaxation_factor;
        const correction_dir_vec2 = Vec2.mulScalar( penetration_info.normal, correction_amount );

        // funny, looks like spring-mass system on bounce... allows for some "penetration/overlay slack"
        // instead of applying penetration correction directly to the object position, apply a velocity in the desired direction 
        rb1.applyLinearVelocity( Vec2.mulScalar( correction_dir_vec2, -rb1.recip_mass ) );
        rb2.applyLinearVelocity( Vec2.mulScalar( correction_dir_vec2,  rb2.recip_mass ) );
        
        // no further momentum calculations to retain the bouncy behavior!
        // NOTE: objects may "slip" through each other due to the slack...
    }
    
    penetrationRelaxation( rb1, rb2, penetration_info ) {
        if ( !SimulationParameters.globalPerformPenetrationRelaxation() ) { return; }
        
        const relaxation_factor = 1.0 / (SimulationParameters.globalMaxPenetrationRelaxationIterations() * 0.9);
        //const relaxation_factor = 1.0 / (SimulationParameters.globalMaxPenetrationRelaxationIterations() * 0.8);
        
        const correction_amount = penetration_info.depth / ( rb1.recip_mass + rb2.recip_mass ) * relaxation_factor;
        const correction_dir_vec2 = Vec2.mulScalar( penetration_info.normal, correction_amount );
        
        if ( rb1.recip_mass > 2.0 * MathUtil.f32_Eps() && rb1.vel_vec2.len() > 100000.0 * MathUtil.f32_Eps() ) 
        {
            rb1.translateBy( Vec2.mulScalar( correction_dir_vec2, -rb1.recip_mass ) );
        }         
        if ( rb2.recip_mass > 2.0 * MathUtil.f32_Eps() && rb2.vel_vec2.len() > 100000.0 * MathUtil.f32_Eps() ) 
        {
            rb2.translateBy( Vec2.mulScalar( correction_dir_vec2,  rb2.recip_mass ) );
        } 
    }    
    
    collisionResponse_linearMomentumOnly( rb1, rb2, collision_info ) {
        
        if ( MathUtil.isApproxEqual( rb1.recip_mass, 0.0 ) && MathUtil.isApproxEqual( rb2.recip_mass, 0.0 ) ) { return; }
        
        this.penetrationRelaxation( rb1, rb2, collision_info );
        
        // #####################################################
        // #### "dynamics" part: ####
        const N_vec2 = collision_info.normal;
        
        const v1 = rb1.vel_vec2;
        const v2 = rb2.vel_vec2;
        const relative_vel_vec2 = Vec2.sub( v2, v1 );

        // relative velocity in normal direction
        const rel_vel_magnitude_N = Vec2.dot( relative_vel_vec2, N_vec2 );

        // ignore objects that are moving in opposite dirs
        if (rel_vel_magnitude_N > 0.0) { return; }

        // *** apply response impulses ***
        
        // ############################
        // ### normal component ###
        const new_restitution = Math.min( rb1.restitution, rb2.restitution );

        // Calc impulse scalar - http://www.myphysicslab.com/collision.html
        let j_N = -(1.0 + new_restitution) * rel_vel_magnitude_N;
        j_N = j_N / ( rb1.recip_mass + rb2.recip_mass);
        //j_N = j_N / Math.max( MathUtil.f32_Eps(), go1.recip_mass + go2.recip_mass);

        // impulse is in direction of normal ( from go1 to go2)
        let impulse_vec2 = Vec2.mulScalar( N_vec2, j_N );
        rb1.vel_vec2 = Vec2.sub( rb1.vel_vec2, Vec2.mulScalar( impulse_vec2, rb1.recip_mass ) );
        rb2.vel_vec2 = Vec2.add( rb2.vel_vec2, Vec2.mulScalar( impulse_vec2, rb2.recip_mass ) );

        
        // ############################
        // ### tangential component ###
        const new_friction    = Math.min( rb1.friction,    rb2.friction );
        let tangent_vec2 = Vec2.sub( relative_vel_vec2, Vec2.mulScalar( N_vec2, -Vec2.dot( relative_vel_vec2, N_vec2 ) ) );
        
        // relative_vel_vec2.dot(tangent) should less than 0
        tangent_vec2 = Vec2.mulScalar( Vec2.normalize( tangent_vec2 ), -1.0);

        let j_T = -(1.0 + new_restitution) * Vec2.dot( relative_vel_vec2, tangent_vec2 ) * new_friction;
        j_T = j_T / (rb1.recip_mass + rb2.recip_mass);

        // friction should be smaller than force in normal direction
        if ( j_T > j_N ) {
            j_T = j_N;
        }

        //impulse is from go1 to go2 (in opposite dir of velocity)
        impulse_vec2 = Vec2.mulScalar( tangent_vec2, j_T );

        rb1.vel_vec2 = Vec2.sub( rb1.vel_vec2, Vec2.mulScalar( impulse_vec2, rb1.recip_mass ) );
        rb2.vel_vec2 = Vec2.add( rb2.vel_vec2, Vec2.mulScalar( impulse_vec2, rb2.recip_mass ) );        
    }
    
    collisionResponse_full( rb1, rb2, collision_info ) {
        
        if ( MathUtil.isApproxEqual( rb1.recip_mass, 0.0 ) && MathUtil.isApproxEqual( rb2.recip_mass, 0.0 ) ) { return; }
        
        this.penetrationRelaxation( rb1, rb2, collision_info );
        //this.penetrationRelaxationSlack( rb1, rb2, collision_info ); // more bounce :-)
        
        // #####################################################
        // #### "dynamics" part: ####
        const N_vec2 = collision_info.normal;

        const recip_mass_sum = rb1.recip_mass + rb2.recip_mass;
        //the direction of collisionInfo is always from go1 to go2
        //but the Mass is inversed, so start scale with go2 and end scale with go1
        const start_vec2 = Vec2.mulScalar( collision_info.start_collision_pt, rb2.recip_mass / ( recip_mass_sum ) );
        const end_vec2   = Vec2.mulScalar( collision_info.end_collision_pt,   rb1.recip_mass / ( recip_mass_sum ) );
        const p_vec2 = Vec2.add( start_vec2, end_vec2 );
        //r is vector from center of object to collision point
        const r1_vec2 = Vec2.sub( p_vec2, rb1.pos_vec2 );
        const r2_vec2 = Vec2.sub( p_vec2, rb2.pos_vec2 );

        //newV = V + mAngularVelocity cross R
        const v1_vec2 = Vec2.add( rb1.vel_vec2, new Vec2( -rb1.angular_vel * r1_vec2.y, rb1.angular_vel * r1_vec2.x ) );
        const v2_vec2 = Vec2.add( rb2.vel_vec2, new Vec2( -rb2.angular_vel * r2_vec2.y, rb2.angular_vel * r2_vec2.x ) );
        const relative_vel_vec2 = Vec2.sub( v2_vec2, v1_vec2 );

        // Relative velocity in normal direction
        const rel_vel_magnitude_N = Vec2.dot( relative_vel_vec2, N_vec2 );

        //if objects moving apart ignore
        if (rel_vel_magnitude_N > 0) {
            return;
        }

        // compute and apply response impulses for each object    
        const new_restitution = Math.min( rb1.restitution, rb2.restitution );

        //R cross N
        const r1_cross_N = Vec2.cross2( r1_vec2, N_vec2 );
        const r2_cross_N = Vec2.cross2( r2_vec2, N_vec2 );

        // Calc impulse scalar
        // the formula of jN can be found in http://www.myphysicslab.com/collision.html
        let j_N = -(1.0 + new_restitution) * rel_vel_magnitude_N;
        j_N = j_N / ( recip_mass_sum +
                      r1_cross_N * r1_cross_N * rb1.recip_inertia +
                      r2_cross_N * r2_cross_N * rb2.recip_inertia );

        //impulse is in direction of normal ( from go1 to go2)
        let impulse_vec2 = Vec2.mulScalar( N_vec2, j_N );
        // impulse = F dt = m * delta_v
        // delta_v = impulse / m
        rb1.vel_vec2 = Vec2.sub( rb1.vel_vec2, Vec2.mulScalar( impulse_vec2, rb1.recip_mass ) );
        rb2.vel_vec2 = Vec2.add( rb2.vel_vec2, Vec2.mulScalar( impulse_vec2, rb2.recip_mass ) );

        rb1.angular_vel -= r1_cross_N * j_N * rb1.recip_inertia;
        rb2.angular_vel += r2_cross_N * j_N * rb2.recip_inertia;

        
        // ############################
        // ### tangential component ###
        const new_friction = Math.min(rb1.friction, rb2.friction);
        let tangent_vec2 = Vec2.sub( relative_vel_vec2, Vec2.mulScalar( N_vec2, -Vec2.dot( relative_vel_vec2, N_vec2 ) ) );
        //let tangent_vec2 = Vec2.sub( relative_vel_vec2, Vec2.mulScalar( N_vec2, Vec2.dot( relative_vel_vec2, N_vec2 ) ) );
        //let tangent_vec2 = Vec2.add( relative_vel_vec2, Vec2.mulScalar( N_vec2, Vec2.dot( relative_vel_vec2, N_vec2 ) ) );

        // if ( isNaN( tangent_vec2.x ) ) {
        //     console.error( `tangent_vec2 is NaN` );
        // }
        // if ( MathUtil.isApproxEqual( tangent_vec2.len(), 0.0 ) ) {
        //     console.error( `tangent_vec2 has (almost) zero length` );
        // }
        
        //relative_vel_vec2.dot(tangent) should less than 0
        tangent_vec2 = Vec2.mulScalar( Vec2.normalize( tangent_vec2 ), -1.0 );
        //tangent_vec2 = Vec2.normalize( tangent_vec2 );
        //tangent_vec2.normalize();

        const r1_cross_T = Vec2.cross2( r1_vec2, tangent_vec2 );
        const r2_cross_T = Vec2.cross2( r2_vec2, tangent_vec2 );

        let j_T = -(1 + new_restitution) * Vec2.dot( relative_vel_vec2, tangent_vec2 ) * new_friction;
        //let j_T = -(1 + new_friction /*?*/) * Vec2.dot( relative_vel_vec2, tangent_vec2 ) * new_friction;
        j_T = j_T / ( recip_mass_sum + 
                      r1_cross_T * r1_cross_T * rb1.recip_inertia + 
                      r2_cross_T * r2_cross_T * rb2.recip_inertia );

        //friction should less than force in normal direction
        if (j_T > j_N) {
            j_T = j_N;
        }

        // if ( rb1.shape_type == ShapeType.polygon || rb2.shape_type == ShapeType.polygon ) {
        //     console.log( 'polygon case' );
        // }
        
        //impulse is from go1 to go2 (in opposite direction of velocity)
        impulse_vec2 = Vec2.mulScalar( tangent_vec2, j_T );

        rb1.vel_vec2 = Vec2.sub( rb1.vel_vec2, Vec2.mulScalar( impulse_vec2, rb1.recip_mass ) );
        rb2.vel_vec2 = Vec2.add( rb2.vel_vec2, Vec2.mulScalar( impulse_vec2, rb2.recip_mass ) );
        rb1.angular_vel -= r1_cross_T * j_T * rb1.recip_inertia;
        rb2.angular_vel += r2_cross_T * j_T * rb2.recip_inertia;
        
    }
    
    collisionResponse_withRotationNoFriction( rbA, rbB, collision_info ) {
        
        if ( MathUtil.isApproxEqual( rbA.recip_mass, 0.0 ) && MathUtil.isApproxEqual( rbB.recip_mass, 0.0 ) ) { return; }
        
        this.penetrationRelaxation( rbA, rbB, collision_info );        

        const N_vec2 = collision_info.normal;
        
        const new_restitution = Math.min( rbA.restitution, rbB.restitution );
        
        const rA_vec2 = Vec2.sub( collision_info.start_collision_pt, rbA.pos_vec2 );
        const rB_vec2 = Vec2.sub( collision_info.start_collision_pt, rbB.pos_vec2 );
        
        const rA_perp_vec2 = new Vec2( -rA_vec2.y, rA_vec2.x );
        const rB_perp_vec2 = new Vec2( -rB_vec2.y, rB_vec2.x );
        
        const rA_angular_vel_as_vec2 = Vec2.mulScalar( rA_perp_vec2, rbA.angular_vel );
        const rB_angular_vel_as_vec2 = Vec2.mulScalar( rB_perp_vec2, rbB.angular_vel );
        
        const relative_vel_vec2 = Vec2.sub(
            Vec2.add( rbB.vel_vec2, rB_angular_vel_as_vec2 ),
            Vec2.add( rbA.vel_vec2, rA_angular_vel_as_vec2 ) );
            
        const contact_vel_mag = Vec2.dot( relative_vel_vec2, N_vec2 );
        
        if ( contact_vel_mag > 0.0 ) {
            return; // objects are already moving away from each other
        }
        
        const rA_perp_dot_N = Vec2.dot( rA_perp_vec2, N_vec2 );
        const rB_perp_dot_N = Vec2.dot( rB_perp_vec2, N_vec2 );
        const recip_mass_sum = rbA.recip_mass + rbB.recip_mass;
        const j_denom = 
            recip_mass_sum +
            ( rA_perp_dot_N * rA_perp_dot_N ) * rbA.recip_inertia +
            ( rB_perp_dot_N * rB_perp_dot_N ) * rbB.recip_inertia;
        const j_amount_along_N = -(1.0 + new_restitution) * contact_vel_mag / j_denom;
        
        const j_N = Vec2.mulScalar( N_vec2, j_amount_along_N );
        
        rbA.vel_vec2 = Vec2.add( rbA.vel_vec2, Vec2.mulScalar( j_N, -rbA.recip_mass ) );
        rbB.vel_vec2 = Vec2.add( rbB.vel_vec2, Vec2.mulScalar( j_N,  rbB.recip_mass ) );
        
        rbA.angular_vel += -Vec2.cross2( rA_vec2, j_N ) * rbA.recip_inertia;
        rbB.angular_vel +=  Vec2.cross2( rB_vec2, j_N ) * rbB.recip_inertia;
    }

    collisionResponse_withRotationAndFriction( rbA, rbB, collision_info ) {
        const vel_threshold_squared = 0.0001;
        if ( MathUtil.isApproxEqual( rbA.recip_mass, 0.0 ) && MathUtil.isApproxEqual( rbB.recip_mass, 0.0 ) ) { return; }
        if ( MathUtil.isApproxEqual( rbA.recip_mass, 0.0 ) && rbB.vel_vec2.lenSquared() < vel_threshold_squared ) { return; }
        if ( MathUtil.isApproxEqual( rbB.recip_mass, 0.0 ) && rbA.vel_vec2.lenSquared() < vel_threshold_squared ) { return; }
        if ( rbA.vel_vec2.lenSquared() < vel_threshold_squared && rbB.vel_vec2.lenSquared() < vel_threshold_squared ) { return; }
        
        this.penetrationRelaxation( rbA, rbB, collision_info );
        //this.penetrationRelaxationSlack( rbA, rbB, collision_info );

        const N_vec2 = collision_info.normal;
        
        let j_amount_along_N = 0.0;
        {
            const new_restitution = Math.min( rbA.restitution, rbB.restitution );
            
            const rA_vec2 = Vec2.sub( collision_info.start_collision_pt, rbA.pos_vec2 );
            const rB_vec2 = Vec2.sub( collision_info.start_collision_pt, rbB.pos_vec2 );
            
            const rA_perp_vec2 = new Vec2( -rA_vec2.y, rA_vec2.x );
            const rB_perp_vec2 = new Vec2( -rB_vec2.y, rB_vec2.x );
            
            const rA_angular_vel_as_vec2 = Vec2.mulScalar( rA_perp_vec2, rbA.angular_vel );
            const rB_angular_vel_as_vec2 = Vec2.mulScalar( rB_perp_vec2, rbB.angular_vel );
            
            const relative_vel_vec2 = Vec2.sub(
                Vec2.add( rbB.vel_vec2, rB_angular_vel_as_vec2 ),
                Vec2.add( rbA.vel_vec2, rA_angular_vel_as_vec2 ) );
                
            const contact_vel_N_mag = Vec2.dot( relative_vel_vec2, N_vec2 );
            
            if ( contact_vel_N_mag > 0.0 ) {
                return; // objects are already moving away from each other
            }
            
            const rA_perp_dot_N = Vec2.dot( rA_perp_vec2, N_vec2 );
            const rB_perp_dot_N = Vec2.dot( rB_perp_vec2, N_vec2 );
            const recip_mass_sum = rbA.recip_mass + rbB.recip_mass;
            const j_denom_N = 
                recip_mass_sum +
                ( rA_perp_dot_N * rA_perp_dot_N ) * rbA.recip_inertia +
                ( rB_perp_dot_N * rB_perp_dot_N ) * rbB.recip_inertia;
            j_amount_along_N = -(1.0 + new_restitution) * contact_vel_N_mag / j_denom_N;
            
            const j_N = Vec2.mulScalar( N_vec2, j_amount_along_N );
            
            rbA.vel_vec2 = Vec2.add( rbA.vel_vec2, Vec2.mulScalar( j_N, -rbA.recip_mass ) );
            rbB.vel_vec2 = Vec2.add( rbB.vel_vec2, Vec2.mulScalar( j_N,  rbB.recip_mass ) );
            
            rbA.angular_vel += -Vec2.cross2( rA_vec2, j_N ) * rbA.recip_inertia;
            rbB.angular_vel +=  Vec2.cross2( rB_vec2, j_N ) * rbB.recip_inertia;
        }

        {
            const new_friction = Math.min( rbA.friction, rbB.friction );
            
            const rA_vec2 = Vec2.sub( collision_info.start_collision_pt, rbA.pos_vec2 );
            const rB_vec2 = Vec2.sub( collision_info.start_collision_pt, rbB.pos_vec2 );
            
            const rA_perp_vec2 = new Vec2( -rA_vec2.y, rA_vec2.x );
            const rB_perp_vec2 = new Vec2( -rB_vec2.y, rB_vec2.x );
            
            const rA_angular_vel_as_vec2 = Vec2.mulScalar( rA_perp_vec2, rbA.angular_vel );
            const rB_angular_vel_as_vec2 = Vec2.mulScalar( rB_perp_vec2, rbB.angular_vel );
            
            const relative_vel_vec2 = Vec2.sub(
                Vec2.add( rbB.vel_vec2, rB_angular_vel_as_vec2 ),
                Vec2.add( rbA.vel_vec2, rA_angular_vel_as_vec2 ) );
            
            let T_vec2 = Vec2.sub( relative_vel_vec2, Vec2.mulScalar( N_vec2, Vec2.dot( relative_vel_vec2, N_vec2 ) ) );
            const tangent_len = T_vec2.len();
            if ( MathUtil.isApproxEqual( tangent_len, 0.0 ) ) { return; }
            
            T_vec2 = Vec2.mulScalar( T_vec2, 1.0 / tangent_len ); // normalize tangent vector
            
            
            const rA_perp_dot_T = Vec2.dot( rA_perp_vec2, T_vec2 );
            const rB_perp_dot_T = Vec2.dot( rB_perp_vec2, T_vec2 );
            const recip_mass_sum = rbA.recip_mass + rbB.recip_mass;
            const j_denom_T = 
                recip_mass_sum +
                ( rA_perp_dot_T * rA_perp_dot_T ) * rbA.recip_inertia +
                ( rB_perp_dot_T * rB_perp_dot_T ) * rbB.recip_inertia;
                
            const contact_vel_T_mag = Vec2.dot( relative_vel_vec2, T_vec2 );
                
            //const j_amount_along_T = -(1.0 + new_friction) * contact_vel_T_mag / j_denom;
            let j_amount_along_T = -contact_vel_T_mag / j_denom_T; // friction is applied to the tangent in the opposite direction of where the linear velocity points
            
            // Coloumb's  law - tangent impulse is at most as high as normal impulse
            if ( Math.abs( j_amount_along_T ) > j_amount_along_N * new_friction ) { // actually static friction
                j_amount_along_T = -j_amount_along_N * new_friction; // actually dynamic friction; again invert direction as above for the tangent (friction ) impulse
            }
            
            const j_T = Vec2.mulScalar( T_vec2, j_amount_along_T ); // tangent impulse (due to friction)
            
            rbA.vel_vec2 = Vec2.add( rbA.vel_vec2, Vec2.mulScalar( j_T, -rbA.recip_mass ) );
            rbB.vel_vec2 = Vec2.add( rbB.vel_vec2, Vec2.mulScalar( j_T,  rbB.recip_mass ) );
            
            rbA.angular_vel += -Vec2.cross2( rA_vec2, j_T ) * rbA.recip_inertia;
            rbB.angular_vel +=  Vec2.cross2( rB_vec2, j_T ) * rbB.recip_inertia;
        }

    }
    
    calculateAndDrawCollisionInfo( game_objects ) {
        game_objects.forEach( (game_object) => {
            //const fill_color = [ 0.1, 0.1, 0.1, 0.9 ];
            //game_object.render_primitive.setFillColor( fill_color );
            //game_object.render_primitive.resetFillColor( );
            game_object.resetFillColor();
        } );
        
        let collision_detected = new Set();
        for ( let i = 0; i < game_objects.length; i++ ) {
            for ( let j = i + 1; j < game_objects.length; j++ ) {
                const [ did_narrow_phase_collide, did_broad_phase_collide, collision_info ] = Collisions.collideShapes( game_objects[i].rigid_body, game_objects[j].rigid_body );
                if ( did_narrow_phase_collide ) {
                    //console.log( `collision game objects ${i} | ${j}` );
                    
                    if ( this.show_debug_vis ) {
                        game_objects[i].render_primitive.setFillColor( [ 0.9, 0.1, 0.1, 0.9 ] );
                        game_objects[j].render_primitive.setFillColor( [ 0.9, 0.1, 0.1, 0.9 ] );
                    }
                                        
                    collision_detected.add( i );
                    collision_detected.add( j );
                    
                    if ( collision_info.outside == false && game_objects[i].rigid_body.shape_type != game_objects[j].rigid_body.shape_type) {
                        //console.log( "inside!" );
                        if ( this.show_debug_vis ) {
                            if ( game_objects[i].rigid_body.shape_type == ShapeType.circle ) {
                                game_objects[i].render_primitive.setFillColor( [ 0.1, 0.9, 0.9, 0.9 ] );
                                
                            } else {
                                game_objects[j].render_primitive.setFillColor( [ 0.1, 0.9, 0.9, 0.9 ] );                            
                            }
                        }
                    }

                    this.visualizePenetrationInfo( collision_info );                    
                }
                else if ( did_broad_phase_collide && this.show_debug_vis ) {
                    if ( !collision_detected.has( i ) ) {
                        game_objects[i].render_primitive.setFillColor( [ 0.1, 0.1, 0.9, 0.9 ] );
                    }
                    
                    if ( !collision_detected.has( j ) ) {
                        game_objects[j].render_primitive.setFillColor( [ 0.1, 0.1, 0.9, 0.9 ] );
                    }
                }
            }
        }
        return collision_detected;
    }
    
    setDebugVisibility( show_debug_vis ) {
        this.show_debug_vis = show_debug_vis;
        this.game_objects.forEach( (go) => {
            go.setDebugInfoVisibility( show_debug_vis );
        } );
        this.gfx_debug_container.visible = show_debug_vis;
        this.gfx_static_debug_container.visible = show_debug_vis;
    }
    
    visualizePenetrationInfo( collision_info ) {
        let penetration_info_gfx = new PIXI.Graphics();
        const line_width = 2.5;
        penetration_info_gfx.lineStyle(line_width, 0x66FF66, 1.0);

        const pt_x = collision_info.start_collision_pt.x;
        const pt_y = collision_info.start_collision_pt.y;
        penetration_info_gfx.moveTo(pt_x, pt_y);
        penetration_info_gfx.lineTo(collision_info.end_collision_pt.x, collision_info.end_collision_pt.y);

        let gfx_penetration_vis_center_circle = new PIXI.Graphics()
        .beginFill( 0x55AA55, 1.0 )
        .lineStyle({ width: 1, color: 0x66FF66, alignment: 0 })
        .drawCircle(pt_x, pt_y, 4.0)
        .endFill();
        this.gfx_debug_container.addChild( gfx_penetration_vis_center_circle );
                
        this.gfx_debug_container.addChild( penetration_info_gfx );
    }

    genericAddGameObject( new_go ) {
        new_go.setDebugInfoVisibility( this.show_debug_vis );
        this.game_objects.push( new_go );
    }
    
    addCircleGameObject( radius, mass, restitution, friction ) {
        let rigid_body = new RigidBody_Circle( radius, mass, restitution, friction );
        const line_color = [ 1.0, 1.0, 1.0, 1.0 ];
        const fill_color = [ 0.5, 0.5, 0.5, 0.7 ];
        let render_primitive = new BuiltinRenderPrimitive_Circle( radius, line_color, fill_color );
        
        let new_go = new GameObject( rigid_body, render_primitive );
        //this.game_objects.push( new_go );
        this.genericAddGameObject( new_go );
        
        this.gfx_game_object_container.addChild( render_primitive.gfx_container );
        
        return new_go;
    }

    delayAddPolygonGameObject( path_as_array_of_array2_in, pos_vec2, mass, restitution, friction ) {
        //console.error( `in ${this.delayAddPolygonGameObject.name}` );
        //console.error( `in delayAddPolygonGameObject` );
        
        this.delay_add_game_objects.push( {
            path: path_as_array_of_array2_in,
            pos_vec2: pos_vec2,
            mass: mass,
            restitution: restitution,
            friction: friction,
        } );
    }
    
    addPolygonGameObject_Breakable( path_as_array_of_array2_in, break_sound_alias, collide_callback, mass, restitution, friction ) {
        let { rigid_body, render_primitive } = this.preparePolygonGameObject(path_as_array_of_array2_in, mass, restitution, friction);
        
        let new_go = new GameObject_Breakable( rigid_body, render_primitive, break_sound_alias, collide_callback );
        //let new_go = new GameObject( rigid_body, render_primitive );
        
        new_go.create_game_object_callback = { caller: this, func: this.delayAddPolygonGameObject };
        //this.game_objects.push( new_go );
        this.genericAddGameObject( new_go );
                
        return new_go;
    }

    addPolygonGameObject( path_as_array_of_array2_in, mass, restitution, friction ) {

        let { rigid_body, render_primitive } = this.preparePolygonGameObject(path_as_array_of_array2_in, mass, restitution, friction);
        
        let new_go = new GameObject( rigid_body, render_primitive );
        //this.game_objects.push( new_go );        
        this.genericAddGameObject( new_go );
        
        return new_go;
    }
    
    preparePolygonGameObject(path_as_array_of_array2_in, mass, restitution, friction) {
        let path_as_array_of_array2 = [];
        { // make sure points are given CCW
            // calc center of mass
            let com = new Vec2(0.0, 0.0);
            for (let v = 0; v < path_as_array_of_array2_in.length; v++) {
                const polygon_vertex = path_as_array_of_array2_in[v];
                const polygon_vertex_T = Vec2.fromArray(polygon_vertex);
                com.add(polygon_vertex_T);
            }
            com.scale(1.0 / path_as_array_of_array2_in.length);

            // sort CCW
            let path_angle_and_pt_array = [];
            for (let v = 0; v < path_as_array_of_array2_in.length; v++) {
                const polygon_vertex = path_as_array_of_array2_in[v];
                const polygon_vertex_T = Vec2.fromArray(polygon_vertex);
                const dvec = Vec2.sub(polygon_vertex_T, com);
                const angle_rad = Math.atan2(dvec.y, dvec.x);
                //path_angle_and_pt_array.push(new Array(angle_rad, polygon_vertex));
                path_angle_and_pt_array.push( {angle_rad: angle_rad, polygon_vertex: polygon_vertex, idx: v } );
            }
            path_angle_and_pt_array.sort((a, b) => {
                if (a.angle_rad < b.angle_rad) { return -1; }
                else if (a.angle_rad > b.angle_rad) { return 1; }
                return 0;
            });

            // for (let v = 0; v < path_angle_and_pt_array.length; v++) {
            //     path_as_array_of_array2.push(path_angle_and_pt_array[v].polygon_vertex);
            // }
            
            // keep idx 0 in first position
            const first_idx = path_angle_and_pt_array.findIndex( (val) => val.idx == 0 );
            for (let v = first_idx; v < path_angle_and_pt_array.length; v++) {
                path_as_array_of_array2.push(path_angle_and_pt_array[v].polygon_vertex);
            }
            for (let v = 0; v < first_idx; v++) {
                path_as_array_of_array2.push(path_angle_and_pt_array[v].polygon_vertex);
            }

        }

        // console.log(`in: ${path_as_array_of_array2_in}`);
        // console.log(`in CCW: ${path_as_array_of_array2}`);


        let rigid_body = new RigidBody_Polygon(path_as_array_of_array2, mass, restitution, friction);

        this.bounding_circle = rigid_body.getBoundingCircle();

        let path_as_xy_sequence = [];
        path_as_array_of_array2.forEach((el) => {
            path_as_xy_sequence.push(el[0]);
            path_as_xy_sequence.push(el[1]);
        });

        const line_color = [1.0, 1.0, 1.0, 1.0];
        const fill_color = [0.5, 0.5, 0.5, 0.7];
        let render_primitive = new BuiltinRenderPrimitive_Polygon(path_as_xy_sequence, this.bounding_circle, line_color, fill_color);
        
        this.gfx_game_object_container.addChild( render_primitive.gfx_container );
        
        return { rigid_body, render_primitive };
    }

    removeGameObject( go_ref ) {
        let i = 0;
        for ( i = 0; i < this.game_objects.length; i++ ) {
            if ( go_ref == this.game_objects[i] ) { break; }
        }
        if ( i >= this.game_objects.length ) { return false; }
        
        this.gfx_game_object_container.removeChild( this.game_objects[i].render_primitive.gfx_container );
        
        this.game_objects.splice( i, 1 );
        
        return true;
    }
}

