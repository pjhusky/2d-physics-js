class CollisionInfo {
    static none = new CollisionInfo();
    constructor() {
        this.depth = 0.0;
        this.normal = new Vec2(0, 0);
        this.start = new Vec2(0, 0);
        this.end = new Vec2(0, 0);
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
            if (!broad_phase_collision_detected) { return [false, CollisionInfo.none]; }
            else { return [ true, new CollisionInfo() ]; } // TODO: DEBUG for now!!!

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
        
        return [ true, collisionInfo ];
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
        return [ false, CollisionInfo.none ];
    }

    static collidePolygonCircle( poly_A, circ_B ) {
        return this.collideCirclePolygon( circ_B, poly_A );
    }

    static collidePolygonPolygon( poly_A, poly_B ) {
        //console.log( `collide poly-poly` );
        return [ false, CollisionInfo.none ];
    }
}
