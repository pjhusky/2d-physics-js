class GameObjectMgr {
    constructor() {
        this.game_objects = new Array();
    }
    
    getGameObjects() { return this.game_objects; }
    
    updateAllGameObjects() {
        this.game_objects.forEach( (go) => { go.update(); } );
        this.performCollisionDetection( this.game_objects );
    }
    
    performCollisionDetection( game_objects ) {
        game_objects.forEach( (game_object) => {
            game_object.render_primitive.setFillColor( [ 0.1, 0.2, 0.9, 0.6 ] );
        } );
        for ( let i = 0; i < game_objects.length; i++ ) {
            for ( let j = i + 1; j < game_objects.length; j++ ) {
                const [ did_collide, collision_info ] = Collisions.collideShapes( game_objects[i].rigid_body, game_objects[j].rigid_body );
                if ( did_collide ) {
                    //console.log( `collision game objects ${i} | ${j}` );

                    game_objects[i].render_primitive.setFillColor( [ 0.9, 0.2, 0.1, 0.6 ] );
                    game_objects[j].render_primitive.setFillColor( [ 0.9, 0.2, 0.1, 0.6 ] );
                }
            }
        }
    }

    
    addCircleGameObject( radius ) {
        let rigid_body = new RigidBody_Circle( radius );
        let render_primitive = new BuiltinRenderPrimitive_Circle( radius, [ 1.0, 1.0, 1.0, 1.0 ], [ 0.2, 0.2, 0.8, 0.5 ] );
        
        let new_go = new GameObject( rigid_body, render_primitive );
        this.game_objects.push( new_go );
        return new_go;
    }

    addPolygonGameObject( path_as_array_of_array2 ) {
        let rigid_body = new RigidBody_Polygon( path_as_array_of_array2 );
        
        this.bounding_circle = rigid_body.getBoundingCircle();
        
        let path_as_xy_sequence = new Array();
        path_as_array_of_array2.forEach( (el) => {
            path_as_xy_sequence.push( el[0] );
            path_as_xy_sequence.push( el[1] );
        } )
        let render_primitive = new BuiltinRenderPrimitive_Polygon( path_as_xy_sequence, this.bounding_circle, [ 1.0, 1.0, 1.0, 1.0 ], [ 0.2, 0.2, 0.8, 0.5 ] );
        
        let new_go = new GameObject( rigid_body, render_primitive );
        this.game_objects.push( new_go );        
        return new_go;
    }
    
    removeGameObject( go_ref ) {
    }
}