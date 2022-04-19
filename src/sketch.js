// Bakeoff #2 - Seleção de Alvos Fora de Alcance
// IPM 2021-22, Período 3
// Entrega: até dia 22 de Abril às 23h59 através do Fenix
// Bake-off: durante os laboratórios da semana de 18 de Abril

// p5.js reference: https://p5js.org/reference/

// Database (CHANGE THESE!)
const GROUP_NUMBER = 48; // Add your group number here as an integer (e.g., 2, 3)
const BAKE_OFF_DAY = false; // Set to 'true' before sharing during the bake-off day
const ITERATION = 6;

// Target and grid properties (DO NOT CHANGE!)
let PPI, PPCM;
let TARGET_SIZE;
let TARGET_PADDING, MARGIN, LEFT_PADDING, TOP_PADDING;
let continue_button;
let inputArea = { x: 0, y: 0, h: 0, w: 0 }; // Position and size of the user input area

// Metrics
let testStartTime, testEndTime; // time between the start and end of one attempt (54 trials)
let hits = 0; // number of successful selections
let misses = 0; // number of missed selections (used to calculate accuracy)
let database; // Firebase DB

// Study control parameters
let draw_targets = false; // used to control what to show in draw()
let trials = []; // contains the order of targets that activate in the test
let current_trial = 0; // the current trial number (indexes into trials array above)
let attempt = 0; // users complete each test twice to account for practice (attemps 0 and 1)
let fitts_IDs = []; // add the Fitts ID for each selection here (-1 when there is a miss)
let last_mouse_press; // last mouse press position
let missed = false; // whether the user has missed the previous target
let hitSound;
let missSound;

// Target class (position and width)
class Target {
  constructor(x, y, w) {
    this.x = x;
    this.y = y;
    this.w = w;
  }
}

// Runs once at the start
function setup() {
  createCanvas(700, 500); // window size in px before we go into fullScreen()
  frameRate(60); // frame rate (DO NOT CHANGE!)

  randomizeTrials(); // randomize the trial order at the start of execution

  textFont("Arial", 18); // font size for the majority of the text
  drawUserIDScreen(); // draws the user start-up screen (student ID and display size)

  hitSound = loadSound("assets/hit.wav");
  missSound = loadSound("assets/miss.wav");
}

// Runs every frame and redraws the screen
function draw() {
  if (draw_targets) {
    // The user is interacting with the 6x3 target grid
    if (missed) {
      background(color(35, 0, 0)); // sets background to a dark red
    } else {
      background(color(0, 0, 0)); // sets background to black
    }

    // Print trial count at the top left-corner of the canvas
    fill(color(255, 255, 255));
    textAlign(LEFT);
    text("Trial " + (current_trial + 1) + " of " + trials.length, 50, 20);

    // Get virtual and snapped cursor's positions.
    let virtual = getVirtualMouse();
    let snapped = getSnappedMouse();

    // Draw line from the virtual cursor to the current target,
    // and from the current to the next.
    let current_target = getTargetBounds(trials[current_trial]);
    stroke(color(255, 255, 255));
    strokeWeight(10);
    line(snapped.x, snapped.y, current_target.x, current_target.y);
    if (current_trial + 1 < trials.length) {
      let next_target = getTargetBounds(trials[current_trial + 1]);
      stroke(color(255, 255, 255, 50));
      strokeWeight(5);
      line(current_target.x, current_target.y, next_target.x, next_target.y);
    }
    noStroke();

    let next_target = getTargetBounds(trials[current_trial + 1]);

    // Draw all 18 targets
    for (var i = 0; i < 18; i++) drawTarget(i);

    // Draw the user input area
    drawInputArea();

    // Draws the help guide.
    drawGuide();

    // Draw the virtual cursor
    fill(color(255, 255, 255));
    circle(virtual.x, virtual.y, 0.5 * PPCM);

    fill(color(255, 255, 255, 50));
    circle(snapped.x, snapped.y, 0.5 * PPCM);
  }
}

// Print and save results at the end of 54 trials
function printAndSavePerformance() {
  // DO NOT CHANGE THESE!
  let accuracy = parseFloat(hits * 100) / parseFloat(hits + misses);
  let test_time = (testEndTime - testStartTime) / 1000;
  let time_per_target = nf(test_time / parseFloat(hits + misses), 0, 3);
  let penalty = constrain(
    (parseFloat(95) - parseFloat(hits * 100) / parseFloat(hits + misses)) * 0.2,
    0,
    100
  );
  let target_w_penalty = nf(
    test_time / parseFloat(hits + misses) + penalty,
    0,
    3
  );
  let timestamp =
    day() +
    "/" +
    month() +
    "/" +
    year() +
    "  " +
    hour() +
    ":" +
    minute() +
    ":" +
    second();

  background(color(0, 0, 0)); // clears screen
  fill(color(255, 255, 255)); // set text fill color to white
  text(timestamp, 10, 20); // display time on screen (top-left corner)

  textAlign(CENTER);
  text("Attempt " + (attempt + 1) + " out of 2 completed!", width / 2, 60);
  text("Hits: " + hits, width / 2, 100);
  text("Misses: " + misses, width / 2, 120);
  text("Accuracy: " + accuracy + "%", width / 2, 140);
  text("Total time taken: " + test_time + "s", width / 2, 160);
  text("Average time per target: " + time_per_target + "s", width / 2, 180);
  text(
    "Average time for each target (+ penalty): " + target_w_penalty + "s",
    width / 2,
    220
  );

  // Print Fitts IDS (one per target, -1 if failed selection, optional)
  text("Fitts IDS", width / 2, 260);
  textAlign(CENTER);
  for (var i = 0; i < fitts_IDs.length / 2; i++) {
    text(
      "Target " + (i + 1).toString() + ": " + fitts_IDs[i].toFixed(2),
      width / 4,
      280 + 20 * i
    );
  }
  for (var i = fitts_IDs.length / 2; i < fitts_IDs.length; i++) {
    text(
      "Target " + (i + 1).toString() + ": " + fitts_IDs[i].toFixed(2),
      width - width / 4,
      280 + 20 * (i - fitts_IDs.length / 2)
    );
  }

  // Saves results (DO NOT CHANGE!)
  let attempt_data = {
    project_from: GROUP_NUMBER,
    assessed_by: student_ID,
    test_completed_by: timestamp,
    attempt: attempt,
    hits: hits,
    misses: misses,
    accuracy: accuracy,
    attempt_duration: test_time,
    time_per_target: time_per_target,
    target_w_penalty: target_w_penalty,
    fitts_IDs: fitts_IDs,
  };

  // Send data to DB (DO NOT CHANGE!)
  if (BAKE_OFF_DAY) {
    // Access the Firebase DB
    if (attempt === 0) {
      firebase.initializeApp(firebaseConfig);
      database = firebase.database();
    }

    // Add user performance results
    let db_ref = database.ref("G" + GROUP_NUMBER);
    db_ref.push(attempt_data);
  } else {
    // Access the demo Firebase DB
    if (attempt === 0) {
      firebase.initializeApp(firebaseDemoConfig);
      database = firebase.database();
    }

    // Add user performance results
    let db_ref = database.ref("G" + GROUP_NUMBER);
    attempt_data.iteration = ITERATION;
    db_ref.push(attempt_data);
  }
}

// Mouse button was pressed - lets test to see if hit was in the correct target
function mousePressed() {
  // Only look for mouse releases during the actual test
  // (i.e., during target selections)
  if (draw_targets) {
    // Get the location and size of the target the user should be trying to select
    let target = getTargetBounds(trials[current_trial]);

    // Check to see if the virtual cursor is inside the target bounds,
    // increasing either the 'hits' or 'misses' counters

    if (insideInputArea(mouseX, mouseY)) {
      let snapped = getSnappedMouse();

      if (dist(target.x, target.y, snapped.x, snapped.y) < target.w / 2) {
        missed = false;
        hitSound.setVolume(0.2);
        hitSound.play();
        if (current_trial === 0) {
          fitts_IDs.push(0);
        } else {
          let d = dist(
            last_mouse_press.x,
            last_mouse_press.y,
            target.x,
            target.y
          );
          let id = log(d / target.w + 1) / log(2);
          fitts_IDs.push(id);
        }
        hits++;
      } else {
        missed = true;
        missSound.setVolume(0.2);
        missSound.play();
        missSound.jump(0.5);
        fitts_IDs.push(-1);
        misses++;
      }

      last_mouse_press = snapped;
      current_trial++; // Move on to the next trial/target
    }

    // Check if the user has completed all 54 trials
    if (current_trial === trials.length) {
      testEndTime = millis();
      draw_targets = false; // Stop showing targets and the user performance results
      printAndSavePerformance(); // Print the user's results on-screen and send these to the DB
      attempt++;

      // If there's an attempt to go create a button to start this
      if (attempt < 2) {
        continue_button = createButton("START 2ND ATTEMPT");
        continue_button.mouseReleased(continueTest);
        continue_button.position(
          width / 2 - continue_button.size().width / 2,
          height / 2 - continue_button.size().height / 2
        );
      }
    }
    // Check if this was the first selection in an attempt
    else if (current_trial === 1) testStartTime = millis();
  }
}

// Draw target on-screen
function drawTarget(i) {
  // Get the location and size for target (i)
  let target = getTargetBounds(i);

  if (trials[current_trial] === i) {
    stroke(color(0, 255, 0));
    strokeWeight(4);
    fill(color(150, 200, 150));
  } else if (trials[current_trial + 1] === i) {
    noStroke();
    fill(color(50, 97, 50));
  } else {
    noStroke();
    fill(color(119, 119, 119));
  }

  let box = {
    x: target.x - target.w / 2 - TARGET_PADDING / 2,
    y: target.y - target.w / 2 - TARGET_PADDING / 2,
    w: target.w + TARGET_PADDING,
  };

  // Draws the target
  circle(target.x, target.y, target.w);

  // Draw the input area target
  noStroke();
  rect(
    map(box.x, 0, width, inputArea.x, inputArea.x + inputArea.w) + 1,
    map(box.y, 0, height, inputArea.y, inputArea.y + inputArea.h) + 1,
    map(box.w, 0, width, 0, inputArea.w) - 2
  );

  // Draw the snap box around the target
  fill(color(0, 0, 0, 0));
  stroke(color(255, 255, 255));
  strokeWeight(1);
  rect(box.x, box.y, box.w);

  if (trials[current_trial] === i && trials[current_trial + 1] === i) {
    fill(color(255, 255, 255));
    stroke(color(0, 0, 0));
    textAlign(CENTER, CENTER);
    textSize(24);
    textStyle(BOLD);
    text("2X", target.x, target.y);
    textSize(18);
    textStyle(BOLD);
    text(
      "2X",
      map(target.x, 0, width, inputArea.x, inputArea.x + inputArea.w),
      map(target.y, 0, height, inputArea.y, inputArea.y + inputArea.h)
    );
    textStyle(NORMAL);
    textSize(18);
  }
}

// Returns the position of the virtual cursor.
function getVirtualMouse() {
  return {
    x: map(mouseX, inputArea.x, inputArea.x + inputArea.w, 0, width),
    y: map(mouseY, inputArea.y, inputArea.y + inputArea.h, 0, height),
  };
}

// Returns the position of the snapped cursor.
function getSnappedMouse() {
  let virtual = getVirtualMouse();
  for (var i = 0; i < 18; i++) {
    let target = getTargetBounds(i);
    if (
      Math.abs(virtual.x - target.x) < TARGET_PADDING / 2 + TARGET_SIZE / 2 &&
      Math.abs(virtual.y - target.y) < TARGET_PADDING / 2 + TARGET_SIZE / 2
    ) {
      return { x: target.x, y: target.y };
    }
  }
  return virtual;
}

// Returns the location and size of a given target
function getTargetBounds(i) {
  var x =
    parseInt(LEFT_PADDING) +
    parseInt((i % 3) * (TARGET_SIZE + TARGET_PADDING) + MARGIN);
  var y =
    parseInt(TOP_PADDING) +
    parseInt(Math.floor(i / 3) * (TARGET_SIZE + TARGET_PADDING) + MARGIN);

  return new Target(x, y, TARGET_SIZE);
}

// Evoked after the user starts its second (and last) attempt
function continueTest() {
  // Re-randomize the trial order
  shuffle(trials, true);
  current_trial = 0;
  print("trial order: " + trials);

  // Resets performance variables
  hits = 0;
  misses = 0;
  fitts_IDs = [];

  continue_button.remove();

  // Shows the targets again
  draw_targets = true;
  testStartTime = millis();
}

// Is invoked when the canvas is resized (e.g., when we go fullscreen)
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  let display = new Display({ diagonal: display_size }, window.screen);

  // DO NOT CHANGE THESE!
  PPI = display.ppi; // calculates pixels per inch
  PPCM = PPI / 2.54; // calculates pixels per cm
  TARGET_SIZE = 1.5 * PPCM; // sets the target size in cm, i.e, 1.5cm
  TARGET_PADDING = 1.5 * PPCM; // sets the padding around the targets in cm
  MARGIN = 1.5 * PPCM; // sets the margin around the targets in cm

  // Sets the margin of the grid of targets to the left of the canvas (DO NOT CHANGE!)
  LEFT_PADDING = width / 3 - TARGET_SIZE - 1.5 * TARGET_PADDING - 1.5 * MARGIN;

  // Sets the margin of the grid of targets to the top of the canvas (DO NOT CHANGE!)
  TOP_PADDING = height / 2 - TARGET_SIZE - 3.5 * TARGET_PADDING - 1.5 * MARGIN;

  // Defines the user input area (DO NOT CHANGE!)
  inputArea = {
    x: width / 2 + 2 * TARGET_SIZE,
    y: height / 2,
    w: width / 3,
    h: height / 3,
  };

  // Starts drawing targets immediately after we go fullscreen
  draw_targets = true;
}

// Responsible for drawing the input area
function drawInputArea() {
  noFill();
  stroke(color(220, 220, 220));
  strokeWeight(2);

  rect(inputArea.x, inputArea.y, inputArea.w, inputArea.h);
}

// Responsible for drawing the guide
function drawGuide() {
  let origin = { x: inputArea.x + TARGET_SIZE, y: inputArea.y - TARGET_SIZE * 1 };

  // Current target
  stroke(color(0, 255, 0));
  strokeWeight(4);
  fill(color(150, 200, 150));
  circle(origin.x, origin.y, TARGET_SIZE);

  // Double click target
  circle(origin.x + TARGET_SIZE * 6, origin.y, TARGET_SIZE);
  fill(color(255, 255, 255));
  stroke(color(0, 0, 0));
  textAlign(CENTER, CENTER);
  textSize(24);
  textStyle(BOLD);
  text("2X", origin.x + TARGET_SIZE * 6, origin.y);
  textSize(18);

  // Next target
  noStroke();
  fill(color(50, 97, 50));
  circle(origin.x + TARGET_SIZE * 3, origin.y, TARGET_SIZE);

  fill(color(255, 255, 255));
  noStroke();
  text("Current Target", origin.x, origin.y - TARGET_SIZE);
  text("Next Target", origin.x  + TARGET_SIZE * 3, origin.y - TARGET_SIZE);
  text("Double Click", origin.x + TARGET_SIZE * 6, origin.y - TARGET_SIZE);
}
