import { Container, Rectangle, Text, Graphics } from 'pixi.js';

const STYLE = {
    barWidth: 250,
    barHeight: 25,
    padding: 15,
    healthColor: 0x32cd32,
    healthBgColor: 0x3d3d3d,
    scorePanelColor: 0x2a2a2a,
    textColor: 0xffffff,
    fontFamily: 'system-ui, Avenir, Helvetica, Arial, sans-serif',
};

export class UIOverlay {
  public view: Container;
  
  private scoreText: Text;
  private healthBarFill: Graphics;
  private maxHealth: number = 30;

  constructor(screen: Rectangle) {
    this.view = new Container();

    const healthBarContainer = new Container();
    healthBarContainer.position.set(STYLE.padding, STYLE.padding);
    
    const healthBarBg = new Graphics()
      .rect(0, 0, STYLE.barWidth, STYLE.barHeight)
      .fill({ color: STYLE.healthBgColor, alpha: 0.8 });

    this.healthBarFill = new Graphics()
      .rect(0, 0, STYLE.barWidth, STYLE.barHeight)
      .fill(STYLE.healthColor);

    healthBarContainer.addChild(healthBarBg, this.healthBarFill);

    const scoreContainer = new Container();
    
    this.scoreText = new Text({
        text: 'Score: 0',
        style: {
            fill: STYLE.textColor,
            fontSize: 24,
            fontFamily: STYLE.fontFamily,
        }
    });
    this.scoreText.anchor.set(1, 0.5);

    const scorePanel = new Graphics()
      .roundRect(0, 0, 200, 40, 8)
      .fill({ color: STYLE.scorePanelColor, alpha: 0.8 });
    
    this.scoreText.position.set(scorePanel.width - STYLE.padding, scorePanel.height / 2);
    
    scoreContainer.addChild(scorePanel, this.scoreText);
    scoreContainer.position.set(screen.width - scorePanel.width - STYLE.padding, STYLE.padding);
    
    this.view.addChild(healthBarContainer, scoreContainer);
  }

  setScore(score: number) {
    this.scoreText.text = `Score: ${score}`;
  }

  setHealth(health: number) {
    const clampedHealth = Math.max(0, Math.min(health, this.maxHealth));
    const newWidth = (clampedHealth / this.maxHealth) * STYLE.barWidth;
    this.healthBarFill.width = newWidth;
  }
}