"use strict";

onmessage = (e) => {
    console.log('Message received from main script');
    
    let update = e.data.update;
    let updateInterval = 8.0; // in ms
    
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

        
            let post_linear_vel = 0.0;
            let post_angular_vel = 0.0;
            
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
