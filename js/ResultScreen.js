class ResultScreen {

	constructor(coordinator, win, level) {
		this.app = coordinator.app;
		this.coordinator = coordinator;
        this.win = win; // bool, true if player won, false if player lost
        this.level = level; // int, Level that this screen was called from
        this.titleText = null;
        this.levelButton = null;
        this.xCenter = 610; // x coordinate of screen center

        this.keyObject_esc;       
    }
  
	onStart(container) {
        
		this.keyObject_esc = AppUtils.keyboard( "Escape" ); 
		this.keyObject_esc.release = async () => {
			this.coordinator.gotoScene(new Menu(this.coordinator));	
		};
        
        if (this.win) {
            this.resultScreen(container, 'You win', './assets/heartburn.png');
            this.addLevelButton(container, 'Play again');
        } else {
            this.resultScreen(container, 'You loose', './assets/pirate-grave.png');
            this.addLevelButton(container, 'Try again');
        }

        // Add button to go back to menu
        const menuButton = new PIXI.Text('Back to menu (ESC)', exitStyle);
		menuButton.x = this.xCenter;
		menuButton.y = 400.0;
		menuButton.anchor.set(0.5);
		// These options make the text clickable
		menuButton.buttonMode = true;
		menuButton.eventMode = 'dynamic';
		// Go to the menu scene when clicked
		menuButton.on('pointerup', () => {
			this.coordinator.gotoScene(new Menu(this.coordinator));
		});
		container.addChild(menuButton);
	}

    resultScreen(container, displayTitleText, iconSource) {
        // Add title
        this.titleText = new PIXI.Text(displayTitleText, titleStyle);
        this.titleText.x = this.xCenter;
		this.titleText.y = 300;
        this.titleText.anchor.set(0.5);
        container.addChild(this.titleText);

        // Add icon
        this.icon = PIXI.Sprite.from(iconSource);
		this.icon.width = 120;
    	this.icon.height = 120;
		this.icon.x = this.xCenter;
		this.icon.y = 150;
		this.icon.anchor.set(0.5);
        container.addChild(this.icon);
    }

    addLevelButton (container, displayText) {
        // Add button to go to same level again
        this.levelButton = new PIXI.Text(displayText, levelButtonStyle);
		this.levelButton.x = this.xCenter;
		this.levelButton.y = 430.0;
        this.levelButton.anchor.set(0.5);
		this.levelButton.buttonMode = true;
		this.levelButton.eventMode = 'dynamic';

        // Go to the gameplay scene when clicked
		if (this.level == 1) {
            this.levelButton.on('pointerup', () => {
			    this.coordinator.gotoScene(new GameplayLevel1(this.coordinator));
		    });
        // Level 2 was deactivated
        // } else if (this.level == 2) {
        //     this.levelButton.on('pointerup', () => {
		// 	    this.coordinator.gotoScene(new GameplayLevel2(this.coordinator));
		//     });
        } else if (this.level == 3) {
            this.levelButton.on('pointerup', () => {
			    this.coordinator.gotoScene(new GameplayLevel3(this.coordinator));
		    });
        } else if (this.level == 4) {
            this.levelButton.on('pointerup', () => {
			    this.coordinator.gotoScene(new GameplayLevel4(this.coordinator));
		    });
        } else if (this.level == 5) {
            this.levelButton.on('pointerup', () => {
			    this.coordinator.gotoScene(new GameplayLevel5(this.coordinator));
		    });
        } else if (this.level == 6) {
            this.levelButton.on('pointerup', () => {
			    this.coordinator.gotoScene(new GameplayLevel6(this.coordinator));
		    });
        } else if (this.level == 7) {
            this.levelButton.on('pointerup', () => {
			    this.coordinator.gotoScene(new GameplayLevel7(this.coordinator));
		    });
        } else if (this.level == 8) {
            this.levelButton.on('pointerup', () => {
			    this.coordinator.gotoScene(new GameplayLevel8(this.coordinator));
		    });
        } else if (this.level == 9) {
            this.levelButton.on('pointerup', () => {
			    this.coordinator.gotoScene(new GameplayLevel9(this.coordinator));
		    });
        }
        container.addChild(this.levelButton);        
    }

	onUpdate() {}
  
	onFinish() {
        this.keyObject_esc.unsubscribe();
    }
}