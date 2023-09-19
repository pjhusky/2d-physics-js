// //class Input {
//     // https://stackoverflow.com/questions/3691461/remove-key-press-delay-in-javascript
//     // Keyboard input with customisable repeat (set to 0 for no key repeat)
//     //
//     //function KeyboardController(keys, repeat) {
//     //constructor(document, window, keys, repeat) {
//     //static KeyboardController(document, window, /*go_mgr,*/ keys, repeat) {
//     let keyboardController = function (document, window, /*go_mgr,*/ keys, repeat) {
//         // Lookup of key codes to timer ID, or null for no repeat
//         //
//         var timers = {};

//         // When key is pressed and we don't already think it's pressed, call the
//         // key action callback and set a timer to generate another one after a delay
//         //
//         document.onkeydown = function (event) {
//             var key = (event || window.event).keyCode;
//             if (!(key in keys))
//                 return true;
//             if (!(key in timers)) {
//                 timers[key] = null;
//                 keys[key]();
//                 if (repeat !== 0)
//                     timers[key] = setInterval(keys[key], repeat);
//             }
//             return false;
//         };

//         // Cancel timeout and mark key as released on keyup
//         //
//         document.onkeyup = function (event) {
//             var key = (event || window.event).keyCode;
//             if (key in timers) {
//                 if (timers[key] !== null)
//                     clearInterval(timers[key]);
//                 delete timers[key];
//             }
//         };

//         // When window is unfocused we may not get key events. To prevent this
//         // causing a key to 'get stuck down', cancel all held keys
//         //
//         window.onblur = function () {
//             for (key in timers)
//                 if (timers[key] !== null)
//                     clearInterval(timers[key]);
//             timers = {};
//         };
//     };   
// //}

onmessage = (e) => {
    console.log('Message received from main script');
  
    
    
//class Input {
    // https://stackoverflow.com/questions/3691461/remove-key-press-delay-in-javascript
    // Keyboard input with customisable repeat (set to 0 for no key repeat)
    //
    //function KeyboardController(keys, repeat) {
    //constructor(document, window, keys, repeat) {
    //static KeyboardController(document, window, /*go_mgr,*/ keys, repeat) {
        let keyboardController = function (document, window, /*go_mgr,*/ keys, repeat) {
            // Lookup of key codes to timer ID, or null for no repeat
            //
            var timers = {};
    
            // When key is pressed and we don't already think it's pressed, call the
            // key action callback and set a timer to generate another one after a delay
            //
            document.onkeydown = function (event) {
                var key = (event || window.event).keyCode;
                if (!(key in keys))
                    return true;
                if (!(key in timers)) {
                    timers[key] = null;
                    keys[key]();
                    if (repeat !== 0)
                        timers[key] = setInterval(keys[key], repeat);
                }
                return false;
            };
    
            // Cancel timeout and mark key as released on keyup
            //
            document.onkeyup = function (event) {
                var key = (event || window.event).keyCode;
                if (key in timers) {
                    if (timers[key] !== null)
                        clearInterval(timers[key]);
                    delete timers[key];
                }
            };
    
            // When window is unfocused we may not get key events. To prevent this
            // causing a key to 'get stuck down', cancel all held keys
            //
            window.onblur = function () {
                for (key in timers)
                    if (timers[key] !== null)
                        clearInterval(timers[key]);
                timers = {};
            };
        };   
    //}
        
    
    
    let update = e.data.update;
    let updateInterval = 8.0; // in ms
    
    //let selected_go = e.data.selected_go;
    let angle_rad = e.data.angle_rad;

    if (update) {
        // start timer
        const startTime = Date.now();
        let loopStartTimes = [startTime, startTime];
        let tTimes = [0.0, 0.0];

        // interval to loop over
        let interval = setInterval(function() {
            // t: elapsed time since worker started
            let t = Date.now() - startTime;

            let post_linear_vel = { x: 0.0, y: 0.0 };
            let post_angular_vel = 0.0;
            
            //Input.KeyboardController( document, window, 
            keyboardController( e.data.document, e.data.window, 
                {
                    37: () => { 
                        //console.log( `arrow left` ); 
                        //let selected_go = this.go_mgr.getGameObjects()[ active_game_object_idx ];
                        //selected_go.rigid_body.applyAngularVelocity( -rotation_radians_speed );
                        post_angular_vel += -rotation_radians_speed;
                    },
                    39: () => { 
                        //console.log( `arrow right` ); 
                        //let selected_go = this.go_mgr.getGameObjects()[ active_game_object_idx ];
                        //selected_go.rigid_body.applyAngularVelocity( rotation_radians_speed );
                        post_angular_vel += rotation_radians_speed;
                    },
                    38: () => {                         
                        //console.log( `arrow up` ); },
                        //let selected_go = this.go_mgr.getGameObjects()[ active_game_object_idx ];
                        //selected_go.applyLinearVelocity( {x: 0.0, y: -translation_speed} );
                        //const rot_mat = Mat2x3.createRotation( selected_go.getAngle() );
                        const rot_mat = Mat2x3.createRotation( angle_rad );
                        let translation_vec2 = Mat2x3.mulDirVector( rot_mat, {x: 0.0, y: -translation_speed}  );
                        //selected_go.applyLinearVelocity( translation_vec2 );
                        //post_linear_vel.add( translation_vec2 );
                        post_linear_vel.x += translation_vec2.x;
                        post_linear_vel.y += translation_vec2.y;
                    },
                    40: () => { 
                        // 		//console.log( `arrow down` ); 
                        //let selected_go = this.go_mgr.getGameObjects()[ active_game_object_idx ];
                        //const rot_mat = Mat2x3.createRotation( selected_go.getAngle() );
                        const rot_mat = Mat2x3.createRotation( angle_rad );
                        let translation_vec2 = Mat2x3.mulDirVector( rot_mat, {x: 0.0, y: translation_speed * 0.5}  );
                        //selected_go.applyLinearVelocity( translation_vec2 );
                        //post_linear_vel.add( translation_vec2 );
                        post_linear_vel.x += translation_vec2.x;
                        post_linear_vel.y += translation_vec2.y;
                    },
                    65: () => { // 'a'
                        //let selected_go = this.go_mgr.getGameObjects()[ active_game_object_idx ];
                        //const rot_mat = Mat2x3.createRotation( selected_go.getAngle() );
                        const rot_mat = Mat2x3.createRotation( angle_rad );
                        let translation_vec2 = Mat2x3.mulDirVector( rot_mat, {x: -translation_speed * 0.45, y: 0.0}  );
                        //selected_go.applyLinearVelocity( translation_vec2 );
                        //post_linear_vel.add( translation_vec2 );
                        post_linear_vel.x += translation_vec2.x;
                        post_linear_vel.y += translation_vec2.y;                        
                    },
                    68: () => { // 'd'
                        //let selected_go = this.go_mgr.getGameObjects()[ active_game_object_idx ];
                        //const rot_mat = Mat2x3.createRotation( selected_go.getAngle() );
                        const rot_mat = Mat2x3.createRotation( angle_rad );
                        let translation_vec2 = Mat2x3.mulDirVector( rot_mat, {x: translation_speed * 0.45, y: 0.0}  );
                        //selected_go.applyLinearVelocity( translation_vec2 );								
                        //post_linear_vel.add( translation_vec2 );
                        post_linear_vel.x += translation_vec2.x;
                        post_linear_vel.y += translation_vec2.y;                        
                    },
                }, 
                1.0/60.0 ); 
        
            // TODO: AM - which time should I send back?
            postMessage({
                update: true, 
                time: Date.now(), 
                linear_vel: post_linear_vel,
                angular_vel: post_angular_vel,
            });

        }, updateInterval);
    } else {
        console.log("Worker received wrong message")
    }
};