class CollisionInfo {
    static none = new CollisionInfo();
    constructor() {
        this.depth = 0.0;
        this.normal = new Vec2(0, 0);
        this.start = new Vec2(0, 0);
        this.end = new Vec2(0, 0);
        this.outside = true;
    }
}

class Collisions {
    
    static collideShapes( shape_A, shape_B ) {
        
        if ( shape_A.shape_type == ShapeType.circle && shape_B.shape_type == ShapeType.circle ) {
            return this.collideCircleCircle( shape_A, shape_B );
        } else {
            //return this.collideCircleCircle( shape_A, shape_B );
            
            // broad phase first => circ-circ
            const broad_phase_collision_detected = this.collideBoundingCircle_BroadPhase( shape_A, shape_B );
            
            // if broad-phase collision detection didn't detect a collision, the enclosed shapes can't collide either!
            if (!broad_phase_collision_detected) { return [false, false, CollisionInfo.none]; }
            //else { return [ true, new CollisionInfo() ]; } // TODO: DEBUG for now!!!

            // did we pass broad-phase collision detection? well then, enter narrow-phase collision detection!
            if (shape_A.shape_type == ShapeType.circle && shape_B.shape_type == ShapeType.polygon) {
                return this.collideCirclePolygon(shape_A, shape_B);
            } else if (shape_A.shape_type == ShapeType.polygon && shape_B.shape_type == ShapeType.circle) {
                return this.collidePolygonCircle(shape_A, shape_B);
            } else if (shape_A.shape_type == ShapeType.polygon && shape_B.shape_type == ShapeType.polygon) {
                return this.collidePolygonPolygon(shape_A, shape_B);
            }
        }
    }
    
    static collideCircleCircle( circ_A, circ_B ) {
        // console.log( `collide circ-circ` );

        const radius_A = circ_A.getBoundRadius();
        const radius_B = circ_B.getBoundRadius();
        //const dist_A_B = Vec2.dist( circ_A.getCenterOfMass(), circ_B.getCenterOfMass() );
        //const dist_A_B = Vec2.dist( circ_A.getBoundingCircleWS()[0], circ_B.getBoundingCircleWS()[0] );
        const dist_A_B = Vec2.dist( Vec2.fromArray( circ_A.getBoundingCircleWS()[0] ), Vec2.fromArray( circ_B.getBoundingCircleWS()[0] ) );
        const collision_depth = ( radius_A + radius_B ) - dist_A_B;
        //if ( dist_A_B > radius_A + radius_B ) {
        //if ( 0.0 > collision_depth ) {
        if ( collision_depth < 0.0 ) {
            return [ false, CollisionInfo.none ];
        }
        
        let collisionInfo = new CollisionInfo();
        collisionInfo.depth = collision_depth;
        
        return [ true, true, collisionInfo ];
    }

    static collideBoundingCircle_BroadPhase( shape_A, shape_B ) { // only check for collision, don't calculate any collision info
        //console.log( `collide circ-circ broad phase` );
        
        const radius_A = shape_A.getBoundRadius();
        const radius_B = shape_B.getBoundRadius();
        //const dist_A_B = Vec2.dist( shape_A.getCenterOfMass(), shape_B.getCenterOfMass() );
        const dist_A_B = Vec2.dist( Vec2.fromArray( shape_A.getBoundingCircleWS()[0] ), Vec2.fromArray( shape_B.getBoundingCircleWS()[0] ) );
        return ( dist_A_B < radius_A + radius_B );
    }
    
    
    
    static collideCirclePolygon( circ_A, poly_B ) {
        //console.log( `collide circ-poly` );
        
        // determine closest edge to circle center
        const circ_bounding_info = circ_A.getBoundingCircleWS();
        const circ_center_WS_vec2 = Vec2.fromArray( circ_bounding_info[0] );
        const circ_radius = circ_bounding_info[1];
    
        let intersection_dist = MathUtil.f32_LargestPosVal();
        let intersection_t = undefined;
        let intersection_edge_s = undefined;
        let intersection_edge_e = undefined;
        for ( let i = 0; i < poly_B.world_space_points_ccw_vec2.length; i++ ) {
            const j = ( ( i + 1 ) % poly_B.world_space_points_ccw_vec2.length);
            const line_segment_start_vec2 = poly_B.world_space_points_ccw_vec2[i];
            const line_segment_end_vec2 = poly_B.world_space_points_ccw_vec2[j];
            
            let t = undefined; // t=0 => edge start pt, t=1 => edge end pt, t "between 0 and 1" => pt along the edge
            const curr_dist = MathUtil.distPointToLineSegment( circ_center_WS_vec2, line_segment_start_vec2, line_segment_end_vec2, t );
            
            //min_dist = Math.min( min_dist, curr_dist );
            if ( curr_dist < intersection_dist ) {
                intersection_dist = curr_dist;
                intersection_edge_s = line_segment_start_vec2;
                intersection_edge_e = line_segment_end_vec2;
                intersection_t = t;
            }
        }
        
        /*
        // check inside / outside case
        const intersection_edge_dir = Vec2.sub( intersection_edge_e, intersection_edge_s );
        const edge_normal = new Vec2( intersection_edge_dir.y, -intersection_edge_dir.x );
        //const edge_normal = new Vec2( -intersection_edge_dir.y, intersection_edge_dir.x );
        let outside = true;
        if ( Vec2.dot( Vec2.sub( circ_center_WS_vec2, intersection_edge_s ), edge_normal ) < 0.0 ) {
            outside = false;
        }
        */
        let outside = false;
        for ( let i = 0; i < poly_B.world_space_points_ccw_vec2.length; i++ ) {
            const j = ( ( i + 1 ) % poly_B.world_space_points_ccw_vec2.length);
            const line_segment_start_vec2 = poly_B.world_space_points_ccw_vec2[i];
            const line_segment_end_vec2 = poly_B.world_space_points_ccw_vec2[j];

            const edge_dir = Vec2.sub( line_segment_end_vec2, line_segment_start_vec2 );
            const edge_normal = new Vec2( edge_dir.y, -edge_dir.x );
            
            if ( Vec2.dot( Vec2.sub( circ_center_WS_vec2, line_segment_start_vec2 ), edge_normal ) > 0.0 ) {
                outside = true;
                break;
            }
        }
        
        let collision_info = new CollisionInfo();
        collision_info.depth = circ_radius - intersection_dist;
        collision_info.outside = outside;
        
        if ( intersection_dist < circ_radius ) {
            return [ true, true, collision_info ];
        }
        
        return [ false, true, CollisionInfo.none ];
    }

    static collidePolygonCircle( poly_A, circ_B ) {
        return this.collideCirclePolygon( circ_B, poly_A );
    }

    static collidePolygonPolygon( poly_A, poly_B ) {
        //console.log( `collide poly-poly` );
        return [ false, CollisionInfo.none ];
    }
}
