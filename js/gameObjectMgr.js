class GameObjectMgr {
    constructor() {
        this.game_objects = [];
        this.gfx_debug_container = new PIXI.Container();
    }
        
    getGameObjects() { return this.game_objects; }
    
    updateAllGameObjects( dt ) {
        
        while(this.gfx_debug_container.children[0]) { 
            this.gfx_debug_container.removeChild(this.gfx_debug_container.children[0]);
        }
        
        this.game_objects.forEach( (go) => { go.update( dt ); } );
        this.performCollisionDetection( this.game_objects );
        
        this.collisionDetectionWithResolve( this.game_objects );
        
        this.game_objects.forEach( (go) => { 
            
            if ( go.recip_mass > 0.0 ) {
                if ( go.angular_vel > 0.0 ) {
                    go.angular_vel = Math.min( go.angular_vel, 1.5 );
                } else if ( go.angular_vel < 0.0 ) {
                    go.angular_vel = Math.max( go.angular_vel, -1.5 );
                }
                
                if ( go.angular_accel > 0.0 ) {
                    go.angular_accel = Math.min( go.angular_accel, 1.5 );
                } else if ( go.angular_accel < 0.0 ) {
                    go.angular_accel = Math.max( go.angular_accel, -1.5 );
                }
            }

        } );
        //console.log( `vel go 0: ${this.game_objects[0].vel_vec2}` );
    }
    
    static max_relaxations() { return 20.0; } // TODO: move to some global parameter file/class
    
    collisionDetectionWithResolve( game_objects ) {
        const max_relaxations = GameObjectMgr.max_relaxations();
        for ( let relaxation_counter = 0; relaxation_counter < max_relaxations; relaxation_counter++ ) {
            // basically the collision function again, but without extra gfx-vis for debugging
            for ( let i = 0; i < game_objects.length; i++ ) {
                for ( let j = i + 1; j < game_objects.length; j++ ) {
                    const [ did_narrow_phase_collide, did_broad_phase_collide, collision_info ] = Collisions.collideShapes( game_objects[i].rigid_body, game_objects[j].rigid_body );
                    
                    if ( did_narrow_phase_collide ) 
                    {
                        // collision normal must always point from first object to second - flip now if that's not the case
                        // otherwise the following collision responses result in weird mixed unstable attracting/repelling behavior!
                        if ( Vec2.dot( collision_info.normal, Vec2.sub( game_objects[j].pos_vec2, game_objects[i].pos_vec2 ) ) < 0.0 ) {
                            collision_info.normal = Vec2.mulScalar( collision_info.normal, -1.0 );
                        }

                        // > only resolve penetrations, but allow for some slack - super fun bouncy mode :-)
                        // this.penetrationRelaxationSlack( game_objects[i], game_objects[j], collision_info );

                        // > proper collision response, apply linear momentum only
                        // this.collisionResponse_linearMomentumOnly( game_objects[i], game_objects[j], collision_info );
                        
                        // > full collision response with linear- and angular momentum
                        this.collisionResponse_full( game_objects[i], game_objects[j], collision_info );
                    }
                }
            }
        }
    }
    
    penetrationRelaxationSlack( go1, go2, penetration_info ) {
        if ( MathUtil.isApproxEqual( go1.recip_mass, 0.0 ) && MathUtil.isApproxEqual( go2.recip_mass, 0.0 ) ) { return; }
        
        const relaxation_factor = 2.0 / (GameObjectMgr.max_relaxations() * 0.9);
        const correction_amount = penetration_info.depth / ( go1.recip_mass + go2.recip_mass ) * relaxation_factor;
        const correction_dir_vec2 = Vec2.mulScalar( penetration_info.normal, correction_amount );

        // funny, looks like spring-mass system on bounce... allows for some "penetration/overlay slack"
        // instead of applying penetration correction directly to the object position, apply a velocity in the desired direction 
        go1.applyLinearVelocity( Vec2.mulScalar( correction_dir_vec2, -go1.recip_mass ) );
        go2.applyLinearVelocity( Vec2.mulScalar( correction_dir_vec2,  go2.recip_mass ) );
        
        // no further momentum calculations to retain the bouncy behavior!
        // NOTE: objects may "slip" through each other due to the slack...
    }
    
    penetrationRelaxation( go1, go2, penetration_info ) {
        const relaxation_factor = 1.0 / (GameObjectMgr.max_relaxations() * 0.9);
        const correction_amount = penetration_info.depth / ( go1.recip_mass + go2.recip_mass ) * relaxation_factor;
        const correction_dir_vec2 = Vec2.mulScalar( penetration_info.normal, correction_amount );
        
        if ( go1.recip_mass > 2.0 * MathUtil.f32_Eps() && go1.vel_vec2.len() > 100000.0 * MathUtil.f32_Eps() ) {
            go1.translateBy( Vec2.mulScalar( correction_dir_vec2, -go1.recip_mass ) );
        }         
        if ( go2.recip_mass > 2.0 * MathUtil.f32_Eps() && go2.vel_vec2.len() > 100000.0 * MathUtil.f32_Eps() ) {
            go2.translateBy( Vec2.mulScalar( correction_dir_vec2,  go2.recip_mass ) );
        } 
    }    
    
    collisionResponse_linearMomentumOnly( go1, go2, collision_info ) {
        
        if ( MathUtil.isApproxEqual( go1.recip_mass, 0.0 ) && MathUtil.isApproxEqual( go2.recip_mass, 0.0 ) ) { return; }
        
        this.penetrationRelaxation( go1, go2, collision_info );
        
        // #####################################################
        // #### "dynamics" part: ####
        const N_vec2 = collision_info.normal;
        
        const v1 = go1.vel_vec2;
        const v2 = go2.vel_vec2;
        const relative_vel_vec2 = Vec2.sub( v2, v1 );

        // relative velocity in normal direction
        const rel_vel_magnitude_N = Vec2.dot( relative_vel_vec2, N_vec2 );

        // ignore objects that are moving in opposite dirs
        if (rel_vel_magnitude_N > 0.0) { return; }

        // *** apply response impulses ***
        
        // ############################
        // ### normal component ###
        const new_restitution = Math.min( go1.restitution, go2.restitution );

        // Calc impulse scalar - http://www.myphysicslab.com/collision.html
        let j_N = -(1.0 + new_restitution) * rel_vel_magnitude_N;
        j_N = j_N / ( go1.recip_mass + go2.recip_mass);
        //j_N = j_N / Math.max( MathUtil.f32_Eps(), go1.recip_mass + go2.recip_mass);

        // impulse is in direction of normal ( from s1 to s2)
        let impulse_vec2 = Vec2.mulScalar( N_vec2, j_N );
        go1.vel_vec2 = Vec2.sub( go1.vel_vec2, Vec2.mulScalar( impulse_vec2, go1.recip_mass ) );
        go2.vel_vec2 = Vec2.add( go2.vel_vec2, Vec2.mulScalar( impulse_vec2, go2.recip_mass ) );

        
        // ############################
        // ### tangential component ###
        const new_friction    = Math.min( go1.friction,    go2.friction );
        let tangent_vec2 = Vec2.sub( relative_vel_vec2, Vec2.mulScalar( N_vec2, -Vec2.dot( relative_vel_vec2, N_vec2 ) ) );
        
        // relative_vel_vec2.dot(tangent) should less than 0
        tangent_vec2 = Vec2.mulScalar( Vec2.normalize( tangent_vec2 ), -1.0);

        let j_T = -(1.0 + new_restitution) * Vec2.dot( relative_vel_vec2, tangent_vec2 ) * new_friction;
        j_T = j_T / (go1.recip_mass + go2.recip_mass);

        // friction should be smaller than force in normal direction
        if ( j_T > j_N ) {
            j_T = j_N;
        }

        //impulse is from go1 to go2 (in opposite dir of velocity)
        impulse_vec2 = Vec2.mulScalar( tangent_vec2, j_T );

        go1.vel_vec2 = Vec2.sub( go1.vel_vec2, Vec2.mulScalar( impulse_vec2, go1.recip_mass ) );
        go2.vel_vec2 = Vec2.add( go2.vel_vec2, Vec2.mulScalar( impulse_vec2, go2.recip_mass ) );        
    }
    
    collisionResponse_full( go1, go2, collision_info ) {
        
        if ( MathUtil.isApproxEqual( go1.recip_mass, 0.0 ) && MathUtil.isApproxEqual( go2.recip_mass, 0.0 ) ) { return; }
        
        this.penetrationRelaxation( go1, go2, collision_info );
        
        // #####################################################
        // #### "dynamics" part: ####
        const N_vec2 = collision_info.normal;

        const recip_mass_sum = go1.recip_mass + go2.recip_mass;
        //the direction of collisionInfo is always from s1 to s2
        //but the Mass is inversed, so start scale with s2 and end scale with s1
        const start_vec2 = Vec2.mulScalar( collision_info.start_collision_pt, go2.recip_mass / ( recip_mass_sum ) );
        const end_vec2   = Vec2.mulScalar( collision_info.end_collision_pt,   go1.recip_mass / ( recip_mass_sum ) );
        const p_vec2 = Vec2.add( start_vec2, end_vec2 );
        //r is vector from center of object to collision point
        const r1_vec2 = Vec2.sub( p_vec2, go1.pos_vec2 );
        const r2_vec2 = Vec2.sub( p_vec2, go2.pos_vec2 );

        //newV = V + mAngularVelocity cross R
        const v1_vec2 = Vec2.add( go1.vel_vec2, new Vec2( -go1.angular_vel * r1_vec2.y, go1.angular_vel * r1_vec2.x ) );
        const v2_vec2 = Vec2.add( go2.vel_vec2, new Vec2( -go2.angular_vel * r2_vec2.y, go2.angular_vel * r2_vec2.x ) );
        const relative_vel_vec2 = Vec2.sub( v2_vec2, v1_vec2 );

        // Relative velocity in normal direction
        const rel_vel_magnitude_N = Vec2.dot( relative_vel_vec2, N_vec2 );

        //if objects moving apart ignore
        if (rel_vel_magnitude_N > 0) {
        //if (rel_vel_magnitude_N >= 0) {
            return;
        }

        // compute and apply response impulses for each object    
        const new_restitution = Math.min( go1.restitution, go2.restitution );

        //R cross N
        const r1_cross_N = Vec2.cross2( r1_vec2, N_vec2 );
        const r2_cross_N = Vec2.cross2( r2_vec2, N_vec2 );

        // Calc impulse scalar
        // the formula of jN can be found in http://www.myphysicslab.com/collision.html
        let j_N = -(1.0 + new_restitution) * rel_vel_magnitude_N;
        j_N = j_N / ( recip_mass_sum +
                      r1_cross_N * r1_cross_N * go1.inertia +
                      r2_cross_N * r2_cross_N * go2.inertia );

        //impulse is in direction of normal ( from s1 to s2)
        let impulse_vec2 = Vec2.mulScalar( N_vec2, j_N );
        // impulse = F dt = m * delta_v
        // delta_v = impulse / m
        go1.vel_vec2 = Vec2.sub( go1.vel_vec2, Vec2.mulScalar( impulse_vec2, go1.recip_mass ) );
        //go2.vel_vec2 = Vec2.sub( go2.vel_vec2, Vec2.mulScalar( impulse_vec2, go2.recip_mass ) );
        go2.vel_vec2 = Vec2.add( go2.vel_vec2, Vec2.mulScalar( impulse_vec2, go2.recip_mass ) );

        go1.angular_vel -= r1_cross_N * j_N * go1.inertia;
        go2.angular_vel += r2_cross_N * j_N * go2.inertia;

        
        // ############################
        // ### tangential component ###
        const new_friction = Math.min(go1.friction, go2.friction);
        let tangent_vec2 = Vec2.sub( relative_vel_vec2, Vec2.mulScalar( N_vec2, -Vec2.dot( relative_vel_vec2, N_vec2 ) ) );
        //let tangent_vec2 = Vec2.add( relative_vel_vec2, Vec2.mulScalar( N_vec2, Vec2.dot( relative_vel_vec2, N_vec2 ) ) );

        if ( isNaN( tangent_vec2.x ) ) {
            console.error( `tangent_vec2 is NaN` );
        }
        if ( MathUtil.isApproxEqual( tangent_vec2.len(), 0.0 ) ) {
            console.error( `tangent_vec2 has (almost) zero length` );
        }
        
        //relative_vel_vec2.dot(tangent) should less than 0
        tangent_vec2 = Vec2.mulScalar( Vec2.normalize( tangent_vec2 ), -1.0 );
        //tangent_vec2.normalize();

        const r1_cross_T = Vec2.cross2( r1_vec2, tangent_vec2 );
        const r2_cross_T = Vec2.cross2( r2_vec2, tangent_vec2 );

        let j_T = -(1 + new_restitution) * Vec2.dot( relative_vel_vec2, tangent_vec2 ) * new_friction;
        j_T = j_T / ( recip_mass_sum + 
                      r1_cross_T * r1_cross_T * go1.inertia + 
                      r2_cross_T * r2_cross_T * go2.inertia );

        //friction should less than force in normal direction
        if (j_T > j_N) {
            j_T = j_N;
        }

        //impulse is from s1 to s2 (in opposite direction of velocity)
        impulse_vec2 = Vec2.mulScalar( tangent_vec2, j_T );

        go1.vel_vec2 = Vec2.sub( go1.vel_vec2, Vec2.mulScalar( impulse_vec2, go1.recip_mass ) );
        go2.vel_vec2 = Vec2.add( go2.vel_vec2, Vec2.mulScalar( impulse_vec2, go2.recip_mass ) );
        go1.angular_vel -= r1_cross_T * j_T * go1.inertia;
        go2.angular_vel += r2_cross_T * j_T * go2.inertia;
        
    }
    
    performCollisionDetection( game_objects ) {
        game_objects.forEach( (game_object) => {
            const fill_color = [ 0.5, 0.5, 0.5, 0.9 ];
            //game_object.render_primitive.setFillColor( fill_color );
            game_object.render_primitive.resetFillColor( );
        } );
        let collision_detected = new Set();
        for ( let i = 0; i < game_objects.length; i++ ) {
            for ( let j = i + 1; j < game_objects.length; j++ ) {
                const [ did_narrow_phase_collide, did_broad_phase_collide, collision_info ] = Collisions.collideShapes( game_objects[i].rigid_body, game_objects[j].rigid_body );
                if ( did_narrow_phase_collide ) {
                    //console.log( `collision game objects ${i} | ${j}` );
                    game_objects[i].render_primitive.setFillColor( [ 0.9, 0.1, 0.1, 0.9 ] );
                    game_objects[j].render_primitive.setFillColor( [ 0.9, 0.1, 0.1, 0.9 ] );
                    
                    collision_detected.add( i );
                    collision_detected.add( j );
                    
                    if ( collision_info.outside == false && game_objects[i].rigid_body.shape_type != game_objects[j].rigid_body.shape_type) {
                        //console.log( "inside!" );
                        if ( game_objects[i].rigid_body.shape_type == ShapeType.circle ) {
                            game_objects[i].render_primitive.setFillColor( [ 0.1, 0.9, 0.9, 0.9 ] );
                            
                        } else {
                            game_objects[j].render_primitive.setFillColor( [ 0.1, 0.9, 0.9, 0.9 ] );                            
                        }
                    }

                    this.visualizePenetrationInfo( collision_info );                    
                }
                else if ( did_broad_phase_collide ) {
                    if ( !collision_detected.has( i ) ) {
                        game_objects[i].render_primitive.setFillColor( [ 0.1, 0.1, 0.9, 0.9 ] );
                    }
                    
                    if ( !collision_detected.has( j ) ) {
                        game_objects[j].render_primitive.setFillColor( [ 0.1, 0.1, 0.9, 0.9 ] );
                    }
                }
            }
        }
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

    addCircleGameObject( radius, mass, restitution, friction ) {
        let rigid_body = new RigidBody_Circle( radius );
        const line_color = [ 1.0, 1.0, 1.0, 1.0 ];
        const fill_color = [ 0.5, 0.5, 0.5, 0.7 ];
        let render_primitive = new BuiltinRenderPrimitive_Circle( radius, line_color, fill_color );
        
        let new_go = new GameObject( rigid_body, render_primitive, mass, restitution, friction );
        this.game_objects.push( new_go );
        return new_go;
    }

    //addPolygonGameObject( path_as_array_of_array2 ) {
    addPolygonGameObject( path_as_array_of_array2_in, mass, restitution, friction ) {

        let path_as_array_of_array2 = [];
        { // make sure points are given CCW
            // calc center of mass
            let com = new Vec2( 0.0, 0.0 );
            for ( let v = 0; v < path_as_array_of_array2_in.length; v++ ) {
                const polygon_vertex = path_as_array_of_array2_in[v];
                const polygon_vertex_T = Vec2.fromArray(polygon_vertex);
                com.add( polygon_vertex_T );
            }
            com.scale( 1.0 / path_as_array_of_array2_in.length );

            // sort CCW
            let path_angle_and_pt_array = new Array();
            for ( let v = 0; v < path_as_array_of_array2_in.length; v++ ) {
                const polygon_vertex = path_as_array_of_array2_in[v];
                const polygon_vertex_T = Vec2.fromArray(polygon_vertex);
                const dvec = Vec2.sub( polygon_vertex_T, com );
                const angle_rad = Math.atan2( dvec.y, dvec.x );
                path_angle_and_pt_array.push( new Array( angle_rad, polygon_vertex ) );
            }
            path_angle_and_pt_array.sort( (a,b) => { 
                if ( a[0] < b[0] ) { return -1; }
                else if ( a[0] > b[0] ) { return 1; }
                return 0;  
            } );
            
            for ( let v = 0; v < path_angle_and_pt_array.length; v++ ) {
                path_as_array_of_array2.push( path_angle_and_pt_array[v][1] );
            }
        }
        
        console.log( `in: ${path_as_array_of_array2_in}` );
        console.log( `in CCW: ${path_as_array_of_array2}` );
        
        
        let rigid_body = new RigidBody_Polygon( path_as_array_of_array2 );
        
        this.bounding_circle = rigid_body.getBoundingCircle();
        
        let path_as_xy_sequence = new Array();
        path_as_array_of_array2.forEach( (el) => {
            path_as_xy_sequence.push( el[0] );
            path_as_xy_sequence.push( el[1] );
        } )
        
        const line_color = [ 1.0, 1.0, 1.0, 1.0 ];
        const fill_color = [ 0.5, 0.5, 0.5, 0.7 ];
        let render_primitive = new BuiltinRenderPrimitive_Polygon( path_as_xy_sequence, this.bounding_circle, line_color, fill_color );
        
        let new_go = new GameObject( rigid_body, render_primitive, mass, restitution, friction );
        this.game_objects.push( new_go );        
        return new_go;
    }
    
    removeGameObject( go_ref ) {
    }
}