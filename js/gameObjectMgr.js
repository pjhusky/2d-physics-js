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
            const fill_color = [ 0.5, 0.5, 0.5, 0.9 ];
            //game_object.render_primitive.setFillColor( fill_color );
            game_object.render_primitive.resetFillColor( );
            //game_object.render_primitive.setFillColor( [ 0.8, 0.8, 0.8, 0.9 ] );
            //game_object.render_primitive.setLineColor( [ 1.0, 1.0, 1.0, 1.0 ] );
        } );
        for ( let i = 0; i < game_objects.length; i++ ) {
            for ( let j = i + 1; j < game_objects.length; j++ ) {
                const [ did_narrow_phase_collide, did_broad_phase_collide, collision_info ] = Collisions.collideShapes( game_objects[i].rigid_body, game_objects[j].rigid_body );
                if ( did_narrow_phase_collide ) {
                    //console.log( `collision game objects ${i} | ${j}` );
                    game_objects[i].render_primitive.setFillColor( [ 0.9, 0.1, 0.1, 0.9 ] );
                    game_objects[j].render_primitive.setFillColor( [ 0.9, 0.1, 0.1, 0.9 ] );
                    
                    if ( collision_info.outside == false && game_objects[i].rigid_body.shape_type != game_objects[j].rigid_body.shape_type) {
                        //console.log( "inside!" );
                        if ( game_objects[i].rigid_body.shape_type == ShapeType.circle ) {
                            game_objects[i].render_primitive.setFillColor( [ 0.1, 0.9, 0.9, 0.9 ] );
                        } else {
                            game_objects[j].render_primitive.setFillColor( [ 0.1, 0.9, 0.9, 0.9 ] );                            
                        }
                    }
                }
                else if ( did_broad_phase_collide ) {
                    game_objects[i].render_primitive.setFillColor( [ 0.1, 0.1, 0.9, 0.9 ] );
                    game_objects[j].render_primitive.setFillColor( [ 0.1, 0.1, 0.9, 0.9 ] );
                }
            }
        }
    }

    addCircleGameObject( radius ) {
        let rigid_body = new RigidBody_Circle( radius );
        const line_color = [ 1.0, 1.0, 1.0, 1.0 ];
        const fill_color = [ 0.5, 0.5, 0.5, 0.7 ];
        let render_primitive = new BuiltinRenderPrimitive_Circle( radius, line_color, fill_color );
        
        let new_go = new GameObject( rigid_body, render_primitive );
        this.game_objects.push( new_go );
        return new_go;
    }

    //addPolygonGameObject( path_as_array_of_array2 ) {
    addPolygonGameObject( path_as_array_of_array2_in ) {

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
        
        let new_go = new GameObject( rigid_body, render_primitive );
        this.game_objects.push( new_go );        
        return new_go;
    }
    
    removeGameObject( go_ref ) {
    }
}