onmessage = (e) => {
    console.log('Message received from main script');
  
    let update = e.data.update;
    let updateInterval = 8.0; // in ms
    
    // // curve1 data:
    // let splineValues = e.data.curve1[0];
    // let duration = e.data.curve1[1];
    // let loop = e.data.curve1[2];
    // let backAndForth = e.data.curve1[3];
    // let easeInEaseOut = e.data.curve1[4];

    // // goblin data:
    // let splineValues = e.data.goblin[0];
    // let duration = e.data.goblin[1];
    // let loop = e.data.goblin[2];
    // let backAndForth = e.data.goblin[3];
    // let easeInEaseOut = e.data.goblin[4];

    let curves = [e.data.goblin, e.data.daemon] 

    if (update) {
        // start timer
        const startTime = Date.now();
        let loopStartTimes = [startTime, startTime];
        let tTimes = [0.0, 0.0];

        // interval to loop over
        let interval = setInterval(function() {
            // t: elapsed time since worker started
            let t = Date.now() - startTime;

            let interpolationResults = [];
            // loop over all curves and interpolate each
            for (let i = 0; i < curves.length; i += 1) {
                let splineValues = curves[i][0];
                let duration = curves[i][1];
                let loop = curves[i][2];
                let backAndForth = curves[i][3];
                let easeInEaseOut = curves[i][4];

                // tTimes starts at 0 again after each loop
                tTimes[i] = Date.now() - loopStartTimes[i];
                let thisCurveReturn;
                if (loop==false && tTimes[i] >= duration){
                    // stop after 1st loop if looping is turned off
                    thisCurveReturn = [splineValues[0].x, splineValues[0].y];
                } else {
                    let target, step;
                    let fullChordLength = splineValues[splineValues.length - 1].chordLength;
                    // factor makes forth or back and fort fit into the duration time
                    let factor = 1.0;
                    if (backAndForth == false){
                        factor = 2.0;
                    }
                    let percent = tTimes[i]/(duration);

                    if (tTimes[i] < duration*0.5*factor){
                        // forth
                        step = (percent*2/factor);
                    } else if (backAndForth == true && tTimes[i] < duration){
                        // back
                        step = (1.0 - percent)*2;
                    }
                    // Ease-in-ease-out function
                    if (easeInEaseOut == true){
                        // use this approximation
                        step = - 2 * step ** 3 + 3 * step ** 2
                    }
                    target = fullChordLength * step;
                    // Find Chord Length closest to the calculated target position
                    // TODO: binary search would be faster
                    let min;
                    let chosen = 0;
                    for (let i = 0; i < splineValues.length; i += 1) {
                        min = Math.abs(splineValues[chosen].chordLength - target);
                        if (Math.abs(splineValues[i].chordLength - target) < min) {
                            chosen = i;
                        };
                    };
                    if (tTimes[i] >= duration) {
                        // start loop again if looping is on
                        loopStartTimes[i] = Date.now()
                    }
                    thisCurveReturn = [splineValues[chosen].x, splineValues[chosen].y];
                }
                interpolationResults.push(thisCurveReturn);
            }

            // TODO: AM - which time should I send back?
            postMessage({
                update: true, 
                time: Date.now(), 
                goblin: interpolationResults[0],
                daemon: interpolationResults[1]
            });

        }, updateInterval);
    } else {
        console.log("Worker received wrong message")
    }
};