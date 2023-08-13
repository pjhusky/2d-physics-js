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

class SupportPointInfo {
    constructor( found_support_pt, query_dir_vec2, support_pt_idx, support_depth ) {
        this.found_support_pt = found_support_pt;
        this.query_dir_vec2 = query_dir_vec2;
        this.support_pt_idx = support_pt_idx;
        this.support_depth = support_depth;
    }
    
    //{ found_support_pt: false, query_dir_vec2: query_dir_vec2, support_pt_idx: -1, support_depth: -1.0 }
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
            return [ false, false, CollisionInfo.none ]; // narrow-phase collision, broad-phase collision, collision info
        }
        
        // TODO - CollisionInfo !!!
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
            // TODO - CollisionInfo !!!
            return [ true, true, collision_info ];
        }
        
        return [ false, true, CollisionInfo.none ];
    }

    static collidePolygonCircle( poly_A, circ_B ) {
        return this.collideCirclePolygon( circ_B, poly_A );
    }

    static getSupportPoint( query_dir_vec2, query_pt_vec2, points_vec2 ) {
        let max_dist = MathUtil.f32_LargestNegVal();
        let support_pt_idx = -1;
        for ( let i = 0; i < points_vec2.length; i++ ) {
            const curr_dist = Vec2.dot( query_dir_vec2, Vec2.sub( points_vec2[i], query_pt_vec2 ) );
            //const curr_dist = Vec2.dot( query_dir_vec2, Vec2.sub( query_pt_vec2, points_vec2[i] ) );
            if ( curr_dist > max_dist ) {
                max_dist = curr_dist;
                support_pt_idx = i;
            }
        }
        
        if ( max_dist < 0.0 ) { // no support pt found
            //return [ false, -1, -1.0 ];
            //return { found_support_pt: false, query_dir_vec2: query_dir_vec2, support_pt_idx: -1, support_depth: -1.0 };
            
            const found_support_pt = false;
            //const query_dir_vec2 = query_dir_vec2;
            const support_pt_idx = -1; 
            const support_depth = -1.0;
            return new SupportPointInfo( found_support_pt, query_dir_vec2, support_pt_idx, support_depth );
        }
        //return [ true, support_pt_idx, max_dist ];
        //return { found_support_pt: true, query_dir_vec2: query_dir_vec2, support_pt_idx: support_pt_idx, support_depth: max_dist };
        //return new SupportPointInfo( { found_support_pt: true, query_dir_vec2: query_dir_vec2, support_pt_idx: support_pt_idx, support_depth: max_dist } );
        
        const found_support_pt = true;
        //const query_dir_vec2 = query_dir_vec2;
        //const support_pt_idx = support_pt_idx;
        const support_depth = max_dist;
        return new SupportPointInfo( found_support_pt, query_dir_vec2, support_pt_idx, support_depth );
    }

    
    static collidePolygonPolygon( poly_A, poly_B ) {
        //console.log( `collide poly-poly` );
        
        // for poly_A - test poly_B
        //let support_pt_info_min_penetration_depth = [ undefined, undefined, MathUtil.f32_LargestPosVal() ];
        //let support_pt_info_min_penetration_depth = /*new SupportPointInfo(*/{ found_support_pt: false, query_dir_vec2: undefined, support_pt_idx: -1, support_depth: -1.0 /*)*/};
        let support_pt_info_min_penetration_depth = new SupportPointInfo( false, undefined, -1, MathUtil.f32_LargestPosVal() );
        
        for ( let i = 0; i < poly_A.world_space_edge_normals_ccw_vec2.length; i++ ) {
            //const query_dir_vec2 = poly_A.world_space_edge_normals_ccw_vec2[i];
            const normal_dir_vec2 = poly_A.world_space_edge_normals_ccw_vec2[i];
            const query_dir_vec2 = Vec2.mulScalar( normal_dir_vec2, -1.0 );
            
            const query_pt_vec2 = poly_A.world_space_points_ccw_vec2[i];
            
            const support_pt_info = this.getSupportPoint( query_dir_vec2, query_pt_vec2, poly_B.world_space_points_ccw_vec2 );
            
            //if ( support_pt_info[ 0 ] == false ) {
            if ( support_pt_info.found_support_pt == false ) {
                return [ false, true, CollisionInfo.none ];
            }
            
            //if ( support_pt_info[2] < support_pt_info_min_penetration_depth[2] ) {
            if ( support_pt_info.support_depth < support_pt_info_min_penetration_depth.support_depth ) {
                //support_pt_info_min_penetration_depth = [ support_pt_info[0], support_pt_info[1], support_pt_info[2] ];
                support_pt_info_min_penetration_depth = support_pt_info;
            }
        }

        // for poly_B - test poly_A        
        for ( let i = 0; i < poly_B.world_space_edge_normals_ccw_vec2.length; i++ ) {
            const normal_dir_vec2 = poly_B.world_space_edge_normals_ccw_vec2[i];
            const query_dir_vec2 = Vec2.mulScalar( normal_dir_vec2, -1.0 );
            
            const query_pt_vec2 = poly_B.world_space_points_ccw_vec2[i];
            
            const support_pt_info = this.getSupportPoint( query_dir_vec2, query_pt_vec2, poly_A.world_space_points_ccw_vec2 );
            
            // if ( support_pt_info[ 0 ] == false ) {
            if ( support_pt_info.found_support_pt == false ) {
                return [ false, true, CollisionInfo.none ];
            }

            // if ( support_pt_info[2] < support_pt_info_min_penetration_depth[2] ) {
            //     support_pt_info_min_penetration_depth = [ support_pt_info[0], support_pt_info[1], support_pt_info[2] ];
            // }
            if ( support_pt_info.support_depth < support_pt_info_min_penetration_depth.support_depth ) {
                support_pt_info_min_penetration_depth = support_pt_info;
            }
        }

        // now we have the axis of least penetration => see "Building a Physics Engine" p.57 on how to use this info for penetration resolving
        // array contains: true, support_pt_idx, max_dist
        // TODO: support_pt_info_min_penetration_depth
        
        const support_pt_idx = support_pt_info_min_penetration_depth.support_pt_idx;
        const support_pt = poly_B.world_space_points_ccw_vec2[support_pt_idx];
        
        let new_collision_info = new CollisionInfo();
        new_collision_info.depth = support_pt_info_min_penetration_depth.support_depth;
        //new_collision_info.normal = Vec2.mulScalar( support_pt_info_min_penetration_depth.query_dir_vec2, -1.0 );
        new_collision_info.normal = support_pt_info_min_penetration_depth.query_dir_vec2;
        new_collision_info.start = support_pt;
        new_collision_info.end = Vec2.mulScalar( new_collision_info.normal, new_collision_info.depth );
        new_collision_info.outside = true;
        
        //return [ false, CollisionInfo.none ];
        return [ true, true, new_collision_info ];
    }
}
