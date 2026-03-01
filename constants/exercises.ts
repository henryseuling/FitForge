// FitForge Exercise Database
// Comprehensive catalog of 100+ exercises with real instructions and coaching cues

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'quadriceps'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core'
  | 'full_body';

export type EquipmentType =
  | 'bodyweight'
  | 'dumbbells'
  | 'barbell'
  | 'cables'
  | 'machines'
  | 'pull_up_bar'
  | 'resistance_bands'
  | 'kettlebell';

export interface Exercise {
  id: string;
  name: string;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: EquipmentType[];
  movementType: 'compound' | 'isolation';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: 'strength' | 'cardio' | 'flexibility' | 'plyometric';
  instructions: string;
  tips: string;
  defaultSets: number;
  defaultReps: string;
}

export const EXERCISES: Exercise[] = [
  // ---------------------------------------------------------------------------
  // CHEST
  // ---------------------------------------------------------------------------
  {
    id: 'barbell-bench-press',
    name: 'Barbell Bench Press',
    primaryMuscle: 'chest',
    secondaryMuscles: ['triceps', 'shoulders'],
    equipment: ['barbell'],
    movementType: 'compound',
    difficulty: 'intermediate',
    category: 'strength',
    instructions:
      'Lie flat on a bench with your feet planted on the floor. Grip the barbell slightly wider than shoulder-width, unrack it, and lower it to your mid-chest under control. Press the bar back up to full lockout while keeping your shoulder blades retracted.',
    tips:
      'Drive through your feet and keep your back arched naturally. Avoid flaring your elbows past 45 degrees to protect your shoulders.',
    defaultSets: 4,
    defaultReps: '8-10',
  },
  {
    id: 'incline-barbell-bench-press',
    name: 'Incline Barbell Bench Press',
    primaryMuscle: 'chest',
    secondaryMuscles: ['shoulders', 'triceps'],
    equipment: ['barbell'],
    movementType: 'compound',
    difficulty: 'intermediate',
    category: 'strength',
    instructions:
      'Set the bench to a 30-45 degree incline. Unrack the barbell and lower it to your upper chest just below the collarbone. Press the bar back up to lockout while maintaining a stable arch and retracted shoulder blades.',
    tips:
      'A 30-degree incline targets the upper chest more effectively than steeper angles. Keep your wrists stacked directly over your elbows throughout the movement.',
    defaultSets: 4,
    defaultReps: '8-10',
  },
  {
    id: 'dumbbell-bench-press',
    name: 'Dumbbell Bench Press',
    primaryMuscle: 'chest',
    secondaryMuscles: ['triceps', 'shoulders'],
    equipment: ['dumbbells'],
    movementType: 'compound',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Lie on a flat bench holding a dumbbell in each hand at chest level with palms facing forward. Press the dumbbells up until your arms are extended, bringing them slightly together at the top. Lower them back down with control until your upper arms are parallel to the floor.',
    tips:
      'Dumbbells allow a deeper stretch than a barbell. Rotate your wrists slightly inward at the top for a stronger chest contraction.',
    defaultSets: 3,
    defaultReps: '10-12',
  },
  {
    id: 'incline-dumbbell-press',
    name: 'Incline Dumbbell Press',
    primaryMuscle: 'chest',
    secondaryMuscles: ['shoulders', 'triceps'],
    equipment: ['dumbbells'],
    movementType: 'compound',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Set the bench to about 30-45 degrees. Hold a dumbbell in each hand at shoulder height and press them upward until your arms are fully extended. Lower them slowly back to the starting position, feeling a stretch in the upper chest.',
    tips:
      'Keep your elbows at roughly a 45-degree angle relative to your torso. Focus on squeezing the upper chest at the top of each rep.',
    defaultSets: 3,
    defaultReps: '10-12',
  },
  {
    id: 'dumbbell-chest-fly',
    name: 'Dumbbell Chest Fly',
    primaryMuscle: 'chest',
    secondaryMuscles: ['shoulders'],
    equipment: ['dumbbells'],
    movementType: 'isolation',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Lie flat on a bench holding dumbbells above your chest with a slight bend in your elbows. Lower the dumbbells out to your sides in a wide arc until you feel a deep stretch in your chest. Squeeze your chest to bring the dumbbells back together at the top.',
    tips:
      'Maintain the same slight elbow bend throughout the movement. Think of hugging a large tree to cue the correct arc pattern.',
    defaultSets: 3,
    defaultReps: '12-15',
  },
  {
    id: 'cable-crossover',
    name: 'Cable Crossover',
    primaryMuscle: 'chest',
    secondaryMuscles: ['shoulders'],
    equipment: ['cables'],
    movementType: 'isolation',
    difficulty: 'intermediate',
    category: 'strength',
    instructions:
      'Stand in the center of a cable station with the pulleys set high. Grab a handle in each hand and step forward slightly with one foot for balance. With a slight bend in your elbows, bring both handles together in front of your chest in a sweeping arc.',
    tips:
      'Lean your torso forward slightly to keep constant tension on the chest. Cross your hands at the bottom for an extra peak contraction.',
    defaultSets: 3,
    defaultReps: '12-15',
  },
  {
    id: 'push-ups',
    name: 'Push-Ups',
    primaryMuscle: 'chest',
    secondaryMuscles: ['triceps', 'shoulders', 'core'],
    equipment: ['bodyweight'],
    movementType: 'compound',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Start in a plank position with your hands slightly wider than shoulder-width. Lower your body until your chest nearly touches the floor, keeping your body in a straight line from head to heels. Push back up to the starting position by fully extending your arms.',
    tips:
      'Engage your core and glutes to prevent your hips from sagging. If full push-ups are too difficult, start from your knees and progress to full push-ups over time.',
    defaultSets: 3,
    defaultReps: '15-20',
  },
  {
    id: 'chest-dips',
    name: 'Chest Dips',
    primaryMuscle: 'chest',
    secondaryMuscles: ['triceps', 'shoulders'],
    equipment: ['bodyweight'],
    movementType: 'compound',
    difficulty: 'intermediate',
    category: 'strength',
    instructions:
      'Grip the parallel bars and lift yourself up with arms fully extended. Lean your torso forward about 30 degrees and lower your body by bending your elbows until your upper arms are parallel to the floor. Press back up to the starting position.',
    tips:
      'The forward lean shifts emphasis to the chest rather than the triceps. Avoid going too deep if you experience shoulder discomfort.',
    defaultSets: 3,
    defaultReps: '8-12',
  },
  {
    id: 'machine-chest-press',
    name: 'Machine Chest Press',
    primaryMuscle: 'chest',
    secondaryMuscles: ['triceps', 'shoulders'],
    equipment: ['machines'],
    movementType: 'compound',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Sit in the chest press machine with your back flat against the pad and feet on the floor. Grip the handles at chest height and press them forward until your arms are fully extended. Slowly return to the starting position without letting the weight stack touch.',
    tips:
      'Adjust the seat height so the handles align with your mid-chest. Focus on squeezing your chest at full extension rather than locking out aggressively.',
    defaultSets: 3,
    defaultReps: '10-12',
  },

  // ---------------------------------------------------------------------------
  // BACK
  // ---------------------------------------------------------------------------
  {
    id: 'pull-ups',
    name: 'Pull-Ups',
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps', 'forearms'],
    equipment: ['pull_up_bar'],
    movementType: 'compound',
    difficulty: 'intermediate',
    category: 'strength',
    instructions:
      'Hang from a pull-up bar with an overhand grip slightly wider than shoulder-width. Pull yourself up by driving your elbows down toward your hips until your chin clears the bar. Lower yourself under control to a full dead hang.',
    tips:
      'Initiate the pull by depressing and retracting your shoulder blades before bending your arms. Avoid kipping or swinging to keep the focus on your lats.',
    defaultSets: 4,
    defaultReps: '6-10',
  },
  {
    id: 'lat-pulldown',
    name: 'Lat Pulldown',
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps', 'forearms'],
    equipment: ['cables'],
    movementType: 'compound',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Sit at the lat pulldown machine and grip the wide bar with an overhand grip. Pull the bar down to your upper chest while leaning back slightly, squeezing your shoulder blades together. Slowly return the bar to the top with controlled resistance.',
    tips:
      'Think about pulling with your elbows rather than your hands to maximize lat engagement. Avoid pulling the bar behind your neck as this places excessive stress on the shoulders.',
    defaultSets: 3,
    defaultReps: '10-12',
  },
  {
    id: 'barbell-row',
    name: 'Barbell Bent-Over Row',
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps', 'forearms', 'core'],
    equipment: ['barbell'],
    movementType: 'compound',
    difficulty: 'intermediate',
    category: 'strength',
    instructions:
      'Stand with feet shoulder-width apart, hinge at the hips until your torso is roughly 45 degrees to the floor, and grip the barbell with an overhand grip. Row the bar into your lower chest or upper abdomen by driving your elbows back. Lower the bar under control until your arms are fully extended.',
    tips:
      'Keep your lower back flat and core braced throughout the lift. A slight knee bend helps maintain balance and protects the lower back.',
    defaultSets: 4,
    defaultReps: '8-10',
  },
  {
    id: 'dumbbell-row',
    name: 'Single-Arm Dumbbell Row',
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps', 'forearms'],
    equipment: ['dumbbells'],
    movementType: 'compound',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Place one knee and the same-side hand on a bench for support. With the other hand, grip a dumbbell and let it hang at arm\'s length. Row the dumbbell up toward your hip by driving your elbow toward the ceiling, then lower it slowly.',
    tips:
      'Avoid rotating your torso as you row. Focus on a full stretch at the bottom and a strong squeeze at the top.',
    defaultSets: 3,
    defaultReps: '10-12',
  },
  {
    id: 'seated-cable-row',
    name: 'Seated Cable Row',
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps', 'forearms'],
    equipment: ['cables'],
    movementType: 'compound',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Sit at a cable row station with your feet on the platform and knees slightly bent. Grab the V-bar handle and pull it toward your lower abdomen while keeping your back upright. Extend your arms forward slowly to return to the start.',
    tips:
      'Keep your torso stationary and avoid rocking back and forth. Squeeze your shoulder blades together at the peak contraction for a full second.',
    defaultSets: 3,
    defaultReps: '10-12',
  },
  {
    id: 'face-pull',
    name: 'Face Pull',
    primaryMuscle: 'back',
    secondaryMuscles: ['shoulders'],
    equipment: ['cables'],
    movementType: 'isolation',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Set a cable pulley to head height with a rope attachment. Grab both ends of the rope with an overhand grip and step back. Pull the rope toward your face, separating the ends as you pull, and squeeze your rear delts and upper back at the peak.',
    tips:
      'Keep your elbows high and in line with your shoulders throughout the pull. This exercise is excellent for shoulder health and posture correction.',
    defaultSets: 3,
    defaultReps: '15-20',
  },
  {
    id: 'conventional-deadlift',
    name: 'Conventional Deadlift',
    primaryMuscle: 'back',
    secondaryMuscles: ['hamstrings', 'glutes', 'forearms', 'core'],
    equipment: ['barbell'],
    movementType: 'compound',
    difficulty: 'advanced',
    category: 'strength',
    instructions:
      'Stand with feet hip-width apart with the barbell over your mid-foot. Hinge at the hips, bend your knees, and grip the bar just outside your shins. Drive through your feet and extend your hips and knees simultaneously to stand up with the bar, keeping it close to your body throughout.',
    tips:
      'Maintain a neutral spine from setup to lockout. Think of pushing the floor away rather than pulling the bar up for better form.',
    defaultSets: 4,
    defaultReps: '5-8',
  },
  {
    id: 't-bar-row',
    name: 'T-Bar Row',
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps', 'forearms'],
    equipment: ['barbell'],
    movementType: 'compound',
    difficulty: 'intermediate',
    category: 'strength',
    instructions:
      'Straddle the T-bar or landmine bar with your feet shoulder-width apart. Bend at the hips and grip the handles. Row the weight toward your chest while keeping your back flat, then lower it under control.',
    tips:
      'Keep your chest up and avoid rounding your upper back. The neutral grip puts your biceps in a stronger pulling position than standard barbell rows.',
    defaultSets: 4,
    defaultReps: '8-10',
  },
  {
    id: 'chin-ups',
    name: 'Chin-Ups',
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps', 'forearms'],
    equipment: ['pull_up_bar'],
    movementType: 'compound',
    difficulty: 'intermediate',
    category: 'strength',
    instructions:
      'Hang from a pull-up bar with an underhand (supinated) grip at shoulder width. Pull yourself up until your chin is above the bar, focusing on driving your elbows down. Lower yourself slowly to a full hang.',
    tips:
      'The underhand grip recruits more biceps than a standard pull-up. Keep your core engaged to prevent swinging.',
    defaultSets: 3,
    defaultReps: '6-10',
  },

  // ---------------------------------------------------------------------------
  // SHOULDERS
  // ---------------------------------------------------------------------------
  {
    id: 'barbell-overhead-press',
    name: 'Barbell Overhead Press',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['triceps', 'core'],
    equipment: ['barbell'],
    movementType: 'compound',
    difficulty: 'intermediate',
    category: 'strength',
    instructions:
      'Stand with feet shoulder-width apart and hold the barbell at shoulder height with an overhand grip. Press the bar overhead until your arms are fully locked out, moving your head slightly forward as the bar passes your face. Lower the bar back to shoulder height under control.',
    tips:
      'Squeeze your glutes and brace your core to stabilize your torso. Avoid excessive arching in your lower back by keeping your ribs down.',
    defaultSets: 4,
    defaultReps: '6-8',
  },
  {
    id: 'dumbbell-shoulder-press',
    name: 'Dumbbell Shoulder Press',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['triceps'],
    equipment: ['dumbbells'],
    movementType: 'compound',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Sit on a bench with back support and hold a dumbbell in each hand at shoulder height with palms facing forward. Press the dumbbells overhead until your arms are fully extended and the weights nearly touch. Lower them slowly back to shoulder height.',
    tips:
      'Keep your back flat against the pad to prevent excessive arching. The seated position isolates the shoulders by removing lower body momentum.',
    defaultSets: 3,
    defaultReps: '8-12',
  },
  {
    id: 'lateral-raise',
    name: 'Lateral Raise',
    primaryMuscle: 'shoulders',
    secondaryMuscles: [],
    equipment: ['dumbbells'],
    movementType: 'isolation',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Stand with dumbbells at your sides, palms facing in. Raise the dumbbells out to your sides with a slight bend in your elbows until your arms are parallel to the floor. Lower them slowly back to the starting position.',
    tips:
      'Lead with your elbows, not your hands, and avoid swinging the weights. Use a lighter weight to maintain strict form and maximize time under tension.',
    defaultSets: 3,
    defaultReps: '12-15',
  },
  {
    id: 'front-raise',
    name: 'Front Raise',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['chest'],
    equipment: ['dumbbells'],
    movementType: 'isolation',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Stand with dumbbells in front of your thighs, palms facing your body. Raise one or both dumbbells forward and up to shoulder height with a slight bend in your elbows. Lower them under control back to the start.',
    tips:
      'Avoid using momentum by leaning back. Stop at shoulder height as going higher shifts the work to the traps.',
    defaultSets: 3,
    defaultReps: '12-15',
  },
  {
    id: 'rear-delt-fly',
    name: 'Rear Delt Fly',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['back'],
    equipment: ['dumbbells'],
    movementType: 'isolation',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Bend at the hips until your torso is nearly parallel to the floor, holding dumbbells hanging below your chest. Raise the dumbbells out to your sides, leading with your elbows, until your arms are in line with your shoulders. Lower them slowly.',
    tips:
      'Keep your neck neutral by looking at the floor. Focus on squeezing your rear delts rather than pulling with your traps.',
    defaultSets: 3,
    defaultReps: '12-15',
  },
  {
    id: 'arnold-press',
    name: 'Arnold Press',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['triceps'],
    equipment: ['dumbbells'],
    movementType: 'compound',
    difficulty: 'intermediate',
    category: 'strength',
    instructions:
      'Sit on a bench with back support and hold dumbbells in front of your shoulders with palms facing you. As you press the dumbbells overhead, rotate your palms to face forward at the top. Reverse the motion as you lower the weights back down.',
    tips:
      'The rotation hits all three heads of the deltoid in one movement. Perform the rotation smoothly and avoid jerky transitions.',
    defaultSets: 3,
    defaultReps: '8-12',
  },
  {
    id: 'upright-row',
    name: 'Upright Row',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['biceps'],
    equipment: ['barbell'],
    movementType: 'compound',
    difficulty: 'intermediate',
    category: 'strength',
    instructions:
      'Stand holding a barbell with an overhand grip, hands about shoulder-width apart. Pull the bar straight up along your body until it reaches your upper chest, keeping your elbows higher than your wrists. Lower the bar slowly to the start.',
    tips:
      'Use a wider grip to reduce internal rotation stress on the shoulders. If you experience shoulder pain, substitute with lateral raises instead.',
    defaultSets: 3,
    defaultReps: '10-12',
  },
  {
    id: 'barbell-shrugs',
    name: 'Barbell Shrugs',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['forearms'],
    equipment: ['barbell'],
    movementType: 'isolation',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Stand holding a barbell at arm\'s length in front of your thighs with an overhand grip. Shrug your shoulders straight up toward your ears as high as possible. Hold the top position for a second, then lower the bar back down.',
    tips:
      'Do not roll your shoulders; simply shrug straight up and down. Use straps if your grip fails before your traps fatigue.',
    defaultSets: 3,
    defaultReps: '12-15',
  },
  {
    id: 'cable-lateral-raise',
    name: 'Cable Lateral Raise',
    primaryMuscle: 'shoulders',
    secondaryMuscles: [],
    equipment: ['cables'],
    movementType: 'isolation',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Stand sideways to a low cable pulley and grab the handle with the far hand. With a slight bend in your elbow, raise your arm out to the side until it is parallel to the floor. Lower slowly and repeat.',
    tips:
      'The cable provides constant tension throughout the range of motion, unlike dumbbells. Keep your body still and avoid leaning away from the cable.',
    defaultSets: 3,
    defaultReps: '12-15',
  },

  // ---------------------------------------------------------------------------
  // BICEPS
  // ---------------------------------------------------------------------------
  {
    id: 'barbell-curl',
    name: 'Barbell Curl',
    primaryMuscle: 'biceps',
    secondaryMuscles: ['forearms'],
    equipment: ['barbell'],
    movementType: 'isolation',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Stand with feet shoulder-width apart and grip a barbell with an underhand grip at shoulder width. Curl the bar up toward your shoulders by bending at the elbows, keeping your upper arms stationary. Lower the bar back down under control.',
    tips:
      'Pin your elbows to your sides and avoid swinging your torso. Use an EZ-bar if a straight bar causes wrist discomfort.',
    defaultSets: 3,
    defaultReps: '10-12',
  },
  {
    id: 'dumbbell-curl',
    name: 'Dumbbell Bicep Curl',
    primaryMuscle: 'biceps',
    secondaryMuscles: ['forearms'],
    equipment: ['dumbbells'],
    movementType: 'isolation',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Stand or sit holding a dumbbell in each hand at your sides with palms facing forward. Curl the dumbbells up toward your shoulders, squeezing your biceps at the top. Lower them slowly to full extension.',
    tips:
      'Supinate your wrists as you curl for maximum bicep peak contraction. Alternate arms or curl both simultaneously depending on preference.',
    defaultSets: 3,
    defaultReps: '10-12',
  },
  {
    id: 'hammer-curl',
    name: 'Hammer Curl',
    primaryMuscle: 'biceps',
    secondaryMuscles: ['forearms'],
    equipment: ['dumbbells'],
    movementType: 'isolation',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Hold dumbbells at your sides with palms facing each other in a neutral grip. Curl the weights up toward your shoulders while maintaining the neutral wrist position throughout. Lower them slowly.',
    tips:
      'The neutral grip targets the brachialis and brachioradialis in addition to the biceps, building arm thickness. Keep your elbows pinned at your sides.',
    defaultSets: 3,
    defaultReps: '10-12',
  },
  {
    id: 'preacher-curl',
    name: 'Preacher Curl',
    primaryMuscle: 'biceps',
    secondaryMuscles: ['forearms'],
    equipment: ['barbell'],
    movementType: 'isolation',
    difficulty: 'intermediate',
    category: 'strength',
    instructions:
      'Sit at a preacher bench and place the backs of your upper arms flat on the pad. Grip an EZ-bar or barbell with an underhand grip and curl the weight up toward your shoulders. Lower it slowly, stopping just short of full extension to maintain tension.',
    tips:
      'Do not let the weight drop at the bottom; control the eccentric to protect your elbows. The pad eliminates momentum, making this a strict isolation movement.',
    defaultSets: 3,
    defaultReps: '10-12',
  },
  {
    id: 'concentration-curl',
    name: 'Concentration Curl',
    primaryMuscle: 'biceps',
    secondaryMuscles: [],
    equipment: ['dumbbells'],
    movementType: 'isolation',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Sit on a bench with your legs spread and brace the back of your upper arm against your inner thigh. Curl the dumbbell up toward your shoulder, squeezing the bicep hard at the top. Lower the weight slowly to full extension.',
    tips:
      'This exercise eliminates all body momentum, making it ideal for building a mind-muscle connection. Twist your pinky finger slightly upward at the top for a peak contraction.',
    defaultSets: 3,
    defaultReps: '10-12',
  },
  {
    id: 'cable-curl',
    name: 'Cable Curl',
    primaryMuscle: 'biceps',
    secondaryMuscles: ['forearms'],
    equipment: ['cables'],
    movementType: 'isolation',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Stand facing a low cable pulley with a straight bar or EZ-bar attachment. Grip the bar underhand at shoulder width and curl it toward your shoulders while keeping your elbows fixed at your sides. Lower the bar slowly under the cable tension.',
    tips:
      'Cable curls provide constant tension throughout the range of motion, unlike free weights. Stand far enough from the stack to maintain tension at the bottom.',
    defaultSets: 3,
    defaultReps: '12-15',
  },
  {
    id: 'incline-dumbbell-curl',
    name: 'Incline Dumbbell Curl',
    primaryMuscle: 'biceps',
    secondaryMuscles: ['forearms'],
    equipment: ['dumbbells'],
    movementType: 'isolation',
    difficulty: 'intermediate',
    category: 'strength',
    instructions:
      'Sit on an incline bench set to about 45 degrees with a dumbbell in each hand, arms hanging straight down. Curl the dumbbells up toward your shoulders while keeping your upper arms perpendicular to the floor. Lower them slowly to a full stretch.',
    tips:
      'The incline position stretches the long head of the biceps for a deeper contraction. Use lighter weight than standing curls since the stretch is more demanding.',
    defaultSets: 3,
    defaultReps: '10-12',
  },

  // ---------------------------------------------------------------------------
  // TRICEPS
  // ---------------------------------------------------------------------------
  {
    id: 'tricep-pushdown',
    name: 'Tricep Pushdown',
    primaryMuscle: 'triceps',
    secondaryMuscles: [],
    equipment: ['cables'],
    movementType: 'isolation',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Stand at a cable station with a straight bar or rope attached to the high pulley. Grip the attachment with your elbows pinned to your sides and push it down until your arms are fully extended. Return the handle slowly back up to about chest height.',
    tips:
      'Keep your torso upright and avoid leaning forward to cheat the weight down. Using a rope attachment allows you to spread the ends apart at the bottom for an extra squeeze.',
    defaultSets: 3,
    defaultReps: '12-15',
  },
  {
    id: 'overhead-tricep-extension',
    name: 'Overhead Tricep Extension',
    primaryMuscle: 'triceps',
    secondaryMuscles: [],
    equipment: ['dumbbells'],
    movementType: 'isolation',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Stand or sit and hold a single dumbbell with both hands overhead, arms fully extended. Lower the dumbbell behind your head by bending your elbows, keeping your upper arms close to your ears. Extend your arms back to the starting position.',
    tips:
      'The overhead position stretches the long head of the triceps for maximum growth stimulus. Avoid flaring your elbows outward as you lower the weight.',
    defaultSets: 3,
    defaultReps: '10-12',
  },
  {
    id: 'skull-crushers',
    name: 'Skull Crushers',
    primaryMuscle: 'triceps',
    secondaryMuscles: [],
    equipment: ['barbell'],
    movementType: 'isolation',
    difficulty: 'intermediate',
    category: 'strength',
    instructions:
      'Lie on a flat bench holding a barbell or EZ-bar with arms extended above your chest. Bend your elbows to lower the bar toward your forehead, keeping your upper arms vertical. Extend your arms back up to the starting position.',
    tips:
      'Lower the bar slightly behind your head rather than directly to your forehead for better long-head tricep activation. Keep your elbows from flaring out.',
    defaultSets: 3,
    defaultReps: '10-12',
  },
  {
    id: 'close-grip-bench-press',
    name: 'Close-Grip Bench Press',
    primaryMuscle: 'triceps',
    secondaryMuscles: ['chest', 'shoulders'],
    equipment: ['barbell'],
    movementType: 'compound',
    difficulty: 'intermediate',
    category: 'strength',
    instructions:
      'Lie on a flat bench and grip the barbell with hands about shoulder-width apart or slightly narrower. Lower the bar to your lower chest, keeping your elbows close to your body. Press the bar back up to full lockout.',
    tips:
      'Do not bring your hands too close together as this strains the wrists. Shoulder-width or just inside shoulder-width is optimal for tricep emphasis.',
    defaultSets: 3,
    defaultReps: '8-10',
  },
  {
    id: 'tricep-dips',
    name: 'Tricep Dips',
    primaryMuscle: 'triceps',
    secondaryMuscles: ['chest', 'shoulders'],
    equipment: ['bodyweight'],
    movementType: 'compound',
    difficulty: 'intermediate',
    category: 'strength',
    instructions:
      'Grip the parallel bars and support yourself with arms fully extended, torso upright. Lower your body by bending your elbows until your upper arms are parallel to the floor. Push yourself back up to full arm extension.',
    tips:
      'Keep your body vertical and elbows close to your sides to emphasize the triceps over the chest. Add weight with a dip belt once bodyweight becomes too easy.',
    defaultSets: 3,
    defaultReps: '8-12',
  },
  {
    id: 'tricep-kickback',
    name: 'Tricep Kickback',
    primaryMuscle: 'triceps',
    secondaryMuscles: [],
    equipment: ['dumbbells'],
    movementType: 'isolation',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Bend forward at the hips with a dumbbell in one hand, upper arm parallel to the floor and elbow bent at 90 degrees. Extend your arm straight back until it is fully locked out, then slowly return to the 90-degree position.',
    tips:
      'Keep your upper arm fixed and only move the forearm. Use a light weight and focus on a full contraction and slow eccentric.',
    defaultSets: 3,
    defaultReps: '12-15',
  },

  // ---------------------------------------------------------------------------
  // FOREARMS
  // ---------------------------------------------------------------------------
  {
    id: 'wrist-curl',
    name: 'Wrist Curl',
    primaryMuscle: 'forearms',
    secondaryMuscles: [],
    equipment: ['barbell'],
    movementType: 'isolation',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Sit on a bench and rest your forearms on your thighs with your wrists hanging over your knees, palms facing up. Curl the barbell upward by flexing your wrists, then lower it by extending your wrists. Let the bar roll to your fingertips for extra range of motion.',
    tips:
      'Use a controlled tempo to avoid straining the wrist joint. Higher rep ranges work best for forearm development.',
    defaultSets: 3,
    defaultReps: '15-20',
  },
  {
    id: 'reverse-wrist-curl',
    name: 'Reverse Wrist Curl',
    primaryMuscle: 'forearms',
    secondaryMuscles: [],
    equipment: ['barbell'],
    movementType: 'isolation',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Sit on a bench with your forearms on your thighs and wrists over your knees, palms facing down. Extend your wrists upward to raise the bar, then lower it slowly. Use a lighter weight than standard wrist curls as this targets the smaller extensor muscles.',
    tips:
      'This exercise strengthens the wrist extensors and is great for preventing tennis elbow. Keep movements smooth and avoid jerking.',
    defaultSets: 3,
    defaultReps: '15-20',
  },
  {
    id: 'farmer-walk',
    name: "Farmer's Walk",
    primaryMuscle: 'forearms',
    secondaryMuscles: ['core', 'shoulders'],
    equipment: ['dumbbells', 'kettlebell'],
    movementType: 'compound',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Pick up a heavy dumbbell or kettlebell in each hand and stand tall with your shoulders pulled back. Walk forward in a straight line with controlled steps, keeping your core tight and the weights stable at your sides. Walk for the prescribed distance or time.',
    tips:
      'Squeeze the handles as hard as possible to maximize grip stimulus. Keep your posture upright; do not let the weight pull your shoulders forward.',
    defaultSets: 3,
    defaultReps: '40m',
  },

  // ---------------------------------------------------------------------------
  // QUADRICEPS
  // ---------------------------------------------------------------------------
  {
    id: 'barbell-back-squat',
    name: 'Barbell Back Squat',
    primaryMuscle: 'quadriceps',
    secondaryMuscles: ['glutes', 'hamstrings', 'core'],
    equipment: ['barbell'],
    movementType: 'compound',
    difficulty: 'intermediate',
    category: 'strength',
    instructions:
      'Position the barbell on your upper traps, unrack it, and step back with feet shoulder-width apart. Push your hips back and bend your knees to lower your body until your thighs are at least parallel to the floor. Drive through your feet to stand back up.',
    tips:
      'Keep your chest up and knees tracking over your toes. Take a deep breath and brace your core before each rep for spinal stability.',
    defaultSets: 4,
    defaultReps: '6-8',
  },
  {
    id: 'front-squat',
    name: 'Front Squat',
    primaryMuscle: 'quadriceps',
    secondaryMuscles: ['glutes', 'core'],
    equipment: ['barbell'],
    movementType: 'compound',
    difficulty: 'advanced',
    category: 'strength',
    instructions:
      'Rest the barbell on the front of your shoulders with your elbows high, gripping the bar with a clean grip or crossed arms. Squat down keeping your torso as upright as possible until your thighs pass parallel. Drive up through your feet to stand.',
    tips:
      'The upright torso position puts more emphasis on the quads and less on the lower back. Keep your elbows up throughout the lift to prevent the bar from rolling forward.',
    defaultSets: 4,
    defaultReps: '6-8',
  },
  {
    id: 'leg-press',
    name: 'Leg Press',
    primaryMuscle: 'quadriceps',
    secondaryMuscles: ['glutes', 'hamstrings'],
    equipment: ['machines'],
    movementType: 'compound',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Sit in the leg press machine with your back flat against the pad and feet shoulder-width apart on the platform. Release the safety handles and lower the sled by bending your knees toward your chest. Push the sled back up without locking out your knees.',
    tips:
      'Place your feet lower on the platform to emphasize the quads, or higher to shift focus to the glutes and hamstrings. Do not let your lower back round off the pad at the bottom.',
    defaultSets: 4,
    defaultReps: '10-12',
  },
  {
    id: 'leg-extension',
    name: 'Leg Extension',
    primaryMuscle: 'quadriceps',
    secondaryMuscles: [],
    equipment: ['machines'],
    movementType: 'isolation',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Sit in the leg extension machine with the pad resting on your lower shins and your back against the seat. Extend your legs until they are straight, squeezing your quadriceps at the top. Lower the weight slowly under control.',
    tips:
      'Pause at full extension for a count to maximize the quad contraction. Avoid using momentum or swinging the weight up.',
    defaultSets: 3,
    defaultReps: '12-15',
  },
  {
    id: 'walking-lunges',
    name: 'Walking Lunges',
    primaryMuscle: 'quadriceps',
    secondaryMuscles: ['glutes', 'hamstrings'],
    equipment: ['bodyweight', 'dumbbells'],
    movementType: 'compound',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Stand tall with or without dumbbells at your sides. Step forward with one leg and lower your body until both knees are bent at about 90 degrees. Push off the front foot and step forward with the other leg, continuing to alternate.',
    tips:
      'Keep your torso upright and core engaged throughout. Take large enough steps so your front knee does not extend past your toes.',
    defaultSets: 3,
    defaultReps: '12 each leg',
  },
  {
    id: 'bulgarian-split-squat',
    name: 'Bulgarian Split Squat',
    primaryMuscle: 'quadriceps',
    secondaryMuscles: ['glutes', 'hamstrings'],
    equipment: ['bodyweight', 'dumbbells'],
    movementType: 'compound',
    difficulty: 'intermediate',
    category: 'strength',
    instructions:
      'Stand about two feet in front of a bench and place the top of your rear foot on the bench behind you. Hold dumbbells at your sides or use bodyweight and lower your body until your front thigh is parallel to the floor. Push through your front heel to stand back up.',
    tips:
      'Lean your torso slightly forward to increase glute activation, or stay upright to keep the focus on the quads. Start with bodyweight to master balance before adding load.',
    defaultSets: 3,
    defaultReps: '10 each leg',
  },
  {
    id: 'goblet-squat',
    name: 'Goblet Squat',
    primaryMuscle: 'quadriceps',
    secondaryMuscles: ['glutes', 'core'],
    equipment: ['dumbbells', 'kettlebell'],
    movementType: 'compound',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Hold a dumbbell or kettlebell vertically at your chest with both hands, elbows pointing down. Squat down by pushing your hips back and bending your knees until your thighs are parallel to the floor. Stand back up by driving through your heels.',
    tips:
      'The front-loaded position helps you stay upright and is an excellent way to learn proper squat mechanics. Use your elbows to push your knees apart at the bottom.',
    defaultSets: 3,
    defaultReps: '10-12',
  },
  {
    id: 'hack-squat',
    name: 'Hack Squat',
    primaryMuscle: 'quadriceps',
    secondaryMuscles: ['glutes'],
    equipment: ['machines'],
    movementType: 'compound',
    difficulty: 'intermediate',
    category: 'strength',
    instructions:
      'Position yourself in the hack squat machine with your back flat against the pad and feet shoulder-width apart on the platform. Release the safety and lower the sled by bending your knees until your thighs are at or below parallel. Push the sled back up through your feet.',
    tips:
      'A narrower, lower foot placement emphasizes the outer quads. Keep your knees tracking in line with your toes and avoid letting them cave inward.',
    defaultSets: 4,
    defaultReps: '8-10',
  },

  // ---------------------------------------------------------------------------
  // HAMSTRINGS
  // ---------------------------------------------------------------------------
  {
    id: 'romanian-deadlift',
    name: 'Romanian Deadlift',
    primaryMuscle: 'hamstrings',
    secondaryMuscles: ['glutes', 'back'],
    equipment: ['barbell'],
    movementType: 'compound',
    difficulty: 'intermediate',
    category: 'strength',
    instructions:
      'Stand holding a barbell at hip height with an overhand grip. Push your hips back while keeping a slight bend in your knees, lowering the bar along your thighs and shins until you feel a deep stretch in your hamstrings. Drive your hips forward to return to standing.',
    tips:
      'Keep the bar close to your body throughout the movement. Your back should remain flat; the moment it starts rounding, you have gone too deep.',
    defaultSets: 4,
    defaultReps: '8-10',
  },
  {
    id: 'lying-leg-curl',
    name: 'Lying Leg Curl',
    primaryMuscle: 'hamstrings',
    secondaryMuscles: ['calves'],
    equipment: ['machines'],
    movementType: 'isolation',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Lie face down on the leg curl machine with the pad resting on the back of your lower legs. Curl your legs up by bending your knees, bringing your heels toward your glutes. Lower the weight slowly to the start.',
    tips:
      'Do not let your hips lift off the bench as you curl. Slow the eccentric down to three seconds for maximum hamstring development.',
    defaultSets: 3,
    defaultReps: '10-12',
  },
  {
    id: 'nordic-curl',
    name: 'Nordic Hamstring Curl',
    primaryMuscle: 'hamstrings',
    secondaryMuscles: [],
    equipment: ['bodyweight'],
    movementType: 'isolation',
    difficulty: 'advanced',
    category: 'strength',
    instructions:
      'Kneel on a pad and have a partner hold your ankles or secure your feet under a sturdy object. Slowly lower your torso toward the floor by extending at the knees while keeping your hips extended. Use your hamstrings to resist the descent and push off the floor to return up.',
    tips:
      'This is one of the most effective hamstring exercises for injury prevention. Start by only controlling the lowering phase if you cannot pull yourself back up.',
    defaultSets: 3,
    defaultReps: '5-8',
  },
  {
    id: 'good-morning',
    name: 'Good Morning',
    primaryMuscle: 'hamstrings',
    secondaryMuscles: ['glutes', 'back'],
    equipment: ['barbell'],
    movementType: 'compound',
    difficulty: 'intermediate',
    category: 'strength',
    instructions:
      'Place a barbell across your upper traps like a squat. With a slight bend in your knees, hinge at the hips and lower your torso until it is nearly parallel with the floor. Squeeze your hamstrings and glutes to return to standing.',
    tips:
      'Use a light weight to master the hip hinge pattern before adding load. Keep your core braced and avoid rounding your lower back.',
    defaultSets: 3,
    defaultReps: '8-10',
  },
  {
    id: 'stiff-leg-deadlift',
    name: 'Stiff-Leg Deadlift',
    primaryMuscle: 'hamstrings',
    secondaryMuscles: ['glutes', 'back'],
    equipment: ['barbell'],
    movementType: 'compound',
    difficulty: 'intermediate',
    category: 'strength',
    instructions:
      'Stand with feet hip-width apart holding a barbell at your thighs. With legs kept nearly straight, hinge at the hips and lower the bar toward the floor until you feel a strong hamstring stretch. Return to standing by contracting the hamstrings and glutes.',
    tips:
      'The difference from a Romanian deadlift is that the legs stay straighter, placing more stretch on the hamstrings. Only go as low as your flexibility allows while maintaining a flat back.',
    defaultSets: 3,
    defaultReps: '8-10',
  },
  {
    id: 'seated-leg-curl',
    name: 'Seated Leg Curl',
    primaryMuscle: 'hamstrings',
    secondaryMuscles: [],
    equipment: ['machines'],
    movementType: 'isolation',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Sit in the seated leg curl machine and adjust the pad so it rests on the back of your lower legs. Curl your legs down and back by bending your knees, squeezing your hamstrings at the bottom. Return slowly to the starting position.',
    tips:
      'The seated position pre-stretches the hamstrings at the hip for a more intense contraction. Avoid using momentum to swing the weight.',
    defaultSets: 3,
    defaultReps: '10-12',
  },

  // ---------------------------------------------------------------------------
  // GLUTES
  // ---------------------------------------------------------------------------
  {
    id: 'barbell-hip-thrust',
    name: 'Barbell Hip Thrust',
    primaryMuscle: 'glutes',
    secondaryMuscles: ['hamstrings', 'core'],
    equipment: ['barbell'],
    movementType: 'compound',
    difficulty: 'intermediate',
    category: 'strength',
    instructions:
      'Sit on the floor with your upper back against a bench and a loaded barbell over your hips. Plant your feet flat on the floor at about shoulder width. Drive through your heels to thrust your hips upward until your body forms a straight line from shoulders to knees, then lower back down.',
    tips:
      'Squeeze your glutes hard at the top and hold for a second. Tuck your chin to your chest to avoid hyperextending your lower back at the top.',
    defaultSets: 4,
    defaultReps: '8-12',
  },
  {
    id: 'glute-bridge',
    name: 'Glute Bridge',
    primaryMuscle: 'glutes',
    secondaryMuscles: ['hamstrings', 'core'],
    equipment: ['bodyweight'],
    movementType: 'isolation',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Lie on your back with your knees bent and feet flat on the floor, hip-width apart. Push through your heels to lift your hips off the ground until your body forms a straight line from shoulders to knees. Lower your hips slowly back to the floor.',
    tips:
      'Squeeze your glutes at the top for a two-second hold. To increase difficulty, try single-leg variations or add a barbell across your hips.',
    defaultSets: 3,
    defaultReps: '15-20',
  },
  {
    id: 'cable-kickback',
    name: 'Cable Kickback',
    primaryMuscle: 'glutes',
    secondaryMuscles: ['hamstrings'],
    equipment: ['cables'],
    movementType: 'isolation',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Attach an ankle cuff to a low cable pulley and strap it around your ankle. Face the machine, brace yourself on the frame, and kick your working leg straight back while keeping your leg nearly straight. Return to the start under control.',
    tips:
      'Focus on squeezing the glute at full extension rather than swinging the leg. Lean forward slightly to increase range of motion.',
    defaultSets: 3,
    defaultReps: '12-15 each leg',
  },
  {
    id: 'sumo-deadlift',
    name: 'Sumo Deadlift',
    primaryMuscle: 'glutes',
    secondaryMuscles: ['quadriceps', 'hamstrings', 'back'],
    equipment: ['barbell'],
    movementType: 'compound',
    difficulty: 'intermediate',
    category: 'strength',
    instructions:
      'Stand with a wide stance, toes pointed out about 30-45 degrees, and grip the bar between your legs with arms straight. Push the floor away with your legs while pulling your chest up and driving your hips forward to stand. Lower the bar by reversing the movement.',
    tips:
      'The wide stance shortens the range of motion and shifts emphasis to the glutes and inner thighs. Keep the bar close to your body and your shins vertical.',
    defaultSets: 4,
    defaultReps: '5-8',
  },
  {
    id: 'step-ups',
    name: 'Step-Ups',
    primaryMuscle: 'glutes',
    secondaryMuscles: ['quadriceps', 'hamstrings'],
    equipment: ['bodyweight', 'dumbbells'],
    movementType: 'compound',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Stand facing a bench or sturdy platform holding dumbbells at your sides or using bodyweight. Step up with one foot, driving through your heel to stand fully on the platform. Step back down with control and alternate legs.',
    tips:
      'Use a box height that puts your thigh parallel to the floor when your foot is on it. Avoid pushing off the back foot; let the working leg do all the work.',
    defaultSets: 3,
    defaultReps: '10 each leg',
  },
  {
    id: 'cable-pull-through',
    name: 'Cable Pull-Through',
    primaryMuscle: 'glutes',
    secondaryMuscles: ['hamstrings'],
    equipment: ['cables'],
    movementType: 'compound',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Stand facing away from a low cable pulley with a rope attachment pulled between your legs. Hinge at the hips letting the cable pull your hands back between your legs, then thrust your hips forward to stand tall, squeezing your glutes at the top.',
    tips:
      'This is an excellent exercise for learning the hip hinge pattern. Keep your arms straight throughout; all the movement should come from your hips.',
    defaultSets: 3,
    defaultReps: '12-15',
  },

  // ---------------------------------------------------------------------------
  // CALVES
  // ---------------------------------------------------------------------------
  {
    id: 'standing-calf-raise',
    name: 'Standing Calf Raise',
    primaryMuscle: 'calves',
    secondaryMuscles: [],
    equipment: ['machines'],
    movementType: 'isolation',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Stand on the edge of a calf raise platform with the balls of your feet on the edge and your heels hanging off. Rise up onto your toes as high as possible, squeezing your calves at the top. Lower your heels below the platform for a full stretch.',
    tips:
      'Pause for two seconds at both the top and bottom of each rep. Calves respond well to higher reps and slow eccentrics.',
    defaultSets: 4,
    defaultReps: '15-20',
  },
  {
    id: 'seated-calf-raise',
    name: 'Seated Calf Raise',
    primaryMuscle: 'calves',
    secondaryMuscles: [],
    equipment: ['machines'],
    movementType: 'isolation',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Sit in the seated calf raise machine with the pad resting on your lower thighs and the balls of your feet on the platform. Push up onto your toes, then lower your heels below the edge of the platform. The seated position targets the soleus muscle underneath the gastrocnemius.',
    tips:
      'Use a full range of motion with a pause at both the stretch and the contraction. The soleus is a slow-twitch dominant muscle, so higher reps work particularly well.',
    defaultSets: 4,
    defaultReps: '15-20',
  },
  {
    id: 'calf-press',
    name: 'Calf Press on Leg Press',
    primaryMuscle: 'calves',
    secondaryMuscles: [],
    equipment: ['machines'],
    movementType: 'isolation',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Sit in the leg press machine and place just the balls of your feet on the bottom edge of the platform with your legs extended. Push the sled by pointing your toes, then let your toes come back toward you for a full calf stretch.',
    tips:
      'Use a controlled range of motion and avoid locking out your knees completely. This is a safe alternative to standing calf raises for those with balance issues.',
    defaultSets: 4,
    defaultReps: '15-20',
  },
  {
    id: 'single-leg-calf-raise',
    name: 'Single-Leg Calf Raise',
    primaryMuscle: 'calves',
    secondaryMuscles: [],
    equipment: ['bodyweight'],
    movementType: 'isolation',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Stand on one foot on a step or raised surface with your heel hanging off the edge. Hold onto something for balance. Rise up onto your toes as high as possible, then lower your heel below the step for a full stretch. Complete all reps, then switch legs.',
    tips:
      'This is excellent for correcting calf imbalances between legs. Use bodyweight first and add a dumbbell in the free hand for progression.',
    defaultSets: 3,
    defaultReps: '12-15 each leg',
  },

  // ---------------------------------------------------------------------------
  // CORE
  // ---------------------------------------------------------------------------
  {
    id: 'plank',
    name: 'Plank',
    primaryMuscle: 'core',
    secondaryMuscles: ['shoulders'],
    equipment: ['bodyweight'],
    movementType: 'isolation',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Start in a push-up position or on your forearms with your body forming a straight line from head to heels. Engage your core, glutes, and quads to maintain this rigid position. Hold for the prescribed time without letting your hips sag or pike up.',
    tips:
      'Imagine pulling your belly button toward your spine. If your lower back starts to sag, end the set rather than continuing with poor form.',
    defaultSets: 3,
    defaultReps: '30-60s',
  },
  {
    id: 'hanging-leg-raise',
    name: 'Hanging Leg Raise',
    primaryMuscle: 'core',
    secondaryMuscles: ['forearms'],
    equipment: ['pull_up_bar'],
    movementType: 'isolation',
    difficulty: 'intermediate',
    category: 'strength',
    instructions:
      'Hang from a pull-up bar with an overhand grip, arms fully extended. Keeping your legs straight, raise them in front of you until they are parallel to the floor or higher. Lower them under control back to the starting position.',
    tips:
      'Curl your pelvis up at the top to fully engage the lower abs. If straight legs are too hard, start with bent-knee raises and progress.',
    defaultSets: 3,
    defaultReps: '10-15',
  },
  {
    id: 'cable-crunch',
    name: 'Cable Crunch',
    primaryMuscle: 'core',
    secondaryMuscles: [],
    equipment: ['cables'],
    movementType: 'isolation',
    difficulty: 'intermediate',
    category: 'strength',
    instructions:
      'Kneel in front of a high cable pulley holding a rope attachment behind your head. Crunch down by flexing your spine, driving your elbows toward your knees. Return slowly to the starting position without fully releasing the tension.',
    tips:
      'Focus on curling your ribcage toward your pelvis rather than just bending at the hips. Keep your hips stationary throughout the movement.',
    defaultSets: 3,
    defaultReps: '12-15',
  },
  {
    id: 'russian-twist',
    name: 'Russian Twist',
    primaryMuscle: 'core',
    secondaryMuscles: [],
    equipment: ['bodyweight', 'dumbbells'],
    movementType: 'isolation',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Sit on the floor with your knees bent and feet slightly elevated. Lean back about 45 degrees with your core engaged and hold a weight or clasp your hands together. Rotate your torso from side to side, touching the weight to the floor on each side.',
    tips:
      'Keep your back straight and rotate through your thoracic spine, not your lower back. Move slowly and with control rather than using momentum.',
    defaultSets: 3,
    defaultReps: '20 total',
  },
  {
    id: 'ab-wheel-rollout',
    name: 'Ab Wheel Rollout',
    primaryMuscle: 'core',
    secondaryMuscles: ['shoulders'],
    equipment: ['bodyweight'],
    movementType: 'compound',
    difficulty: 'intermediate',
    category: 'strength',
    instructions:
      'Kneel on the floor holding an ab wheel with both hands. Slowly roll the wheel forward, extending your body while keeping your core braced and back flat. Roll out as far as you can maintain good form, then contract your abs to pull yourself back to the kneeling position.',
    tips:
      'Start with small range of motion and increase gradually. Keep your hips from sagging by squeezing your glutes and bracing your core.',
    defaultSets: 3,
    defaultReps: '8-12',
  },
  {
    id: 'dead-bug',
    name: 'Dead Bug',
    primaryMuscle: 'core',
    secondaryMuscles: [],
    equipment: ['bodyweight'],
    movementType: 'isolation',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Lie on your back with arms extended toward the ceiling and knees bent at 90 degrees above your hips. Simultaneously lower your right arm overhead and extend your left leg toward the floor, keeping your lower back pressed into the ground. Return to the start and repeat on the opposite side.',
    tips:
      'Press your lower back firmly into the floor; if it arches up, you have gone too far. This is an excellent exercise for learning core stabilization.',
    defaultSets: 3,
    defaultReps: '10 each side',
  },
  {
    id: 'bicycle-crunch',
    name: 'Bicycle Crunch',
    primaryMuscle: 'core',
    secondaryMuscles: [],
    equipment: ['bodyweight'],
    movementType: 'isolation',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Lie on your back with your hands behind your head and legs raised with knees bent. Bring your right elbow toward your left knee while straightening your right leg. Alternate sides in a pedaling motion, twisting through your torso with each rep.',
    tips:
      'Do not pull on your neck with your hands; let the rotation come from your obliques. Move slowly and deliberately for maximum ab engagement.',
    defaultSets: 3,
    defaultReps: '20 total',
  },
  {
    id: 'mountain-climbers',
    name: 'Mountain Climbers',
    primaryMuscle: 'core',
    secondaryMuscles: ['shoulders', 'quadriceps'],
    equipment: ['bodyweight'],
    movementType: 'compound',
    difficulty: 'beginner',
    category: 'cardio',
    instructions:
      'Start in a push-up position with your arms straight. Drive one knee toward your chest, then quickly switch legs, alternating back and forth in a running motion. Keep your hips level and core tight throughout.',
    tips:
      'Keep your shoulders directly over your wrists. For a more intense core workout, slow down the pace and hold each knee drive for a count.',
    defaultSets: 3,
    defaultReps: '30s',
  },
  {
    id: 'pallof-press',
    name: 'Pallof Press',
    primaryMuscle: 'core',
    secondaryMuscles: [],
    equipment: ['cables', 'resistance_bands'],
    movementType: 'isolation',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Stand perpendicular to a cable machine or anchored resistance band with the handle at chest height. Hold the handle at your chest with both hands and press it straight out in front of you, resisting the pull of the cable. Hold for a second with arms fully extended, then return to your chest.',
    tips:
      'This is an anti-rotation exercise; the goal is to resist the cable pulling you sideways. Keep your hips and shoulders square throughout each rep.',
    defaultSets: 3,
    defaultReps: '10 each side',
  },

  // ---------------------------------------------------------------------------
  // FULL BODY
  // ---------------------------------------------------------------------------
  {
    id: 'burpees',
    name: 'Burpees',
    primaryMuscle: 'full_body',
    secondaryMuscles: ['chest', 'quadriceps', 'core', 'shoulders'],
    equipment: ['bodyweight'],
    movementType: 'compound',
    difficulty: 'intermediate',
    category: 'cardio',
    instructions:
      'Stand with feet shoulder-width apart. Drop into a squat, place your hands on the floor, and jump your feet back into a push-up position. Perform a push-up, jump your feet back to your hands, and explosively jump up with your hands overhead.',
    tips:
      'Maintain a tight core when jumping back to the plank to avoid lower back sag. To modify, step back into the plank instead of jumping and skip the push-up.',
    defaultSets: 3,
    defaultReps: '10-15',
  },
  {
    id: 'clean-and-press',
    name: 'Clean and Press',
    primaryMuscle: 'full_body',
    secondaryMuscles: ['shoulders', 'back', 'quadriceps', 'glutes'],
    equipment: ['barbell'],
    movementType: 'compound',
    difficulty: 'advanced',
    category: 'strength',
    instructions:
      'Stand with feet hip-width apart and the barbell on the floor. Grip the bar at shoulder width, clean it to your shoulders by explosively extending your hips and catching the bar at your front delts. From this position, press the bar overhead to full lockout, then lower it back to your shoulders.',
    tips:
      'Master the clean and the overhead press separately before combining them. Use your legs to generate power during the clean and keep the bar path close to your body.',
    defaultSets: 4,
    defaultReps: '5-6',
  },
  {
    id: 'thrusters',
    name: 'Thrusters',
    primaryMuscle: 'full_body',
    secondaryMuscles: ['quadriceps', 'shoulders', 'glutes', 'core'],
    equipment: ['barbell', 'dumbbells'],
    movementType: 'compound',
    difficulty: 'intermediate',
    category: 'strength',
    instructions:
      'Hold a barbell in the front rack position or dumbbells at shoulder height. Perform a full front squat, and as you drive up out of the squat, use the momentum to press the weight overhead in one fluid motion. Lower the weight back to your shoulders as you descend into the next squat.',
    tips:
      'The key is using the momentum from the squat to drive the press. Keep your core braced and your elbows up throughout the squat portion.',
    defaultSets: 3,
    defaultReps: '8-10',
  },
  {
    id: 'kettlebell-swing',
    name: 'Kettlebell Swing',
    primaryMuscle: 'full_body',
    secondaryMuscles: ['glutes', 'hamstrings', 'core', 'shoulders'],
    equipment: ['kettlebell'],
    movementType: 'compound',
    difficulty: 'intermediate',
    category: 'cardio',
    instructions:
      'Stand with feet slightly wider than shoulder-width and hold a kettlebell with both hands. Hinge at the hips to swing the kettlebell back between your legs, then drive your hips forward explosively to swing the kettlebell to chest or overhead height. Let gravity bring it back down and repeat the hinge.',
    tips:
      'The power comes from your hip drive, not your arms. Keep your arms relaxed and let the kettlebell float up naturally from the hip extension.',
    defaultSets: 3,
    defaultReps: '15-20',
  },
  {
    id: 'man-maker',
    name: 'Man Maker',
    primaryMuscle: 'full_body',
    secondaryMuscles: ['chest', 'back', 'shoulders', 'core', 'quadriceps'],
    equipment: ['dumbbells'],
    movementType: 'compound',
    difficulty: 'advanced',
    category: 'strength',
    instructions:
      'Start in a push-up position holding two dumbbells. Perform a push-up, then row one dumbbell to your hip, perform another push-up, and row the other dumbbell. Jump your feet to your hands, clean the dumbbells to your shoulders, and press them overhead. Lower and repeat.',
    tips:
      'Use light dumbbells when learning this movement as it demands significant coordination. Maintain a solid plank position during the rows to avoid hip rotation.',
    defaultSets: 3,
    defaultReps: '6-8',
  },
  {
    id: 'battle-ropes',
    name: 'Battle Ropes',
    primaryMuscle: 'full_body',
    secondaryMuscles: ['shoulders', 'core', 'forearms'],
    equipment: ['bodyweight'],
    movementType: 'compound',
    difficulty: 'beginner',
    category: 'cardio',
    instructions:
      'Stand with feet shoulder-width apart, knees slightly bent, holding one end of a battle rope in each hand. Alternately raise and slam each arm to create waves in the rope, maintaining a fast and consistent rhythm. Keep your core braced and feet planted.',
    tips:
      'Stay in a slight squat position to engage your legs and protect your lower back. Vary the patterns with double waves, slams, and circles to target different muscles.',
    defaultSets: 3,
    defaultReps: '30s',
  },

  // ---------------------------------------------------------------------------
  // ADDITIONAL EXERCISES
  // ---------------------------------------------------------------------------

  // More chest
  {
    id: 'decline-bench-press',
    name: 'Decline Bench Press',
    primaryMuscle: 'chest',
    secondaryMuscles: ['triceps', 'shoulders'],
    equipment: ['barbell'],
    movementType: 'compound',
    difficulty: 'intermediate',
    category: 'strength',
    instructions:
      'Lie on a decline bench set to about 15-30 degrees with your feet secured in the foot pads. Unrack the barbell and lower it to your lower chest. Press the bar back up to full lockout.',
    tips:
      'The decline angle targets the lower chest fibers. Use a spotter for safety since it is harder to unrack and rerack in this position.',
    defaultSets: 3,
    defaultReps: '8-10',
  },

  // More back
  {
    id: 'straight-arm-pulldown',
    name: 'Straight-Arm Pulldown',
    primaryMuscle: 'back',
    secondaryMuscles: ['core'],
    equipment: ['cables'],
    movementType: 'isolation',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Stand facing a high cable pulley with a straight bar attachment. With arms nearly straight and a slight bend in the elbows, pull the bar down in an arc to your thighs while keeping your torso still. Return the bar overhead with control.',
    tips:
      'This exercise isolates the lats without bicep involvement. Focus on initiating the pull with your lats rather than your arms.',
    defaultSets: 3,
    defaultReps: '12-15',
  },

  // More shoulders
  {
    id: 'dumbbell-shrugs',
    name: 'Dumbbell Shrugs',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['forearms'],
    equipment: ['dumbbells'],
    movementType: 'isolation',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Stand holding a dumbbell in each hand at your sides with palms facing your body. Shrug your shoulders straight up toward your ears as high as possible. Pause at the top and lower them slowly.',
    tips:
      'Dumbbells allow your arms to hang naturally at your sides for a more comfortable shrug position. Avoid rolling your shoulders; just move straight up and down.',
    defaultSets: 3,
    defaultReps: '12-15',
  },

  // More biceps
  {
    id: 'spider-curl',
    name: 'Spider Curl',
    primaryMuscle: 'biceps',
    secondaryMuscles: [],
    equipment: ['dumbbells'],
    movementType: 'isolation',
    difficulty: 'intermediate',
    category: 'strength',
    instructions:
      'Lie face down on an incline bench set to about 45 degrees with your arms hanging straight down holding dumbbells. Curl the dumbbells up toward your shoulders, keeping your upper arms perpendicular to the floor. Lower them slowly.',
    tips:
      'Gravity works against you throughout the entire range of motion, eliminating any rest at the bottom. This makes it a strict and effective bicep isolation exercise.',
    defaultSets: 3,
    defaultReps: '10-12',
  },

  // More triceps
  {
    id: 'diamond-push-ups',
    name: 'Diamond Push-Ups',
    primaryMuscle: 'triceps',
    secondaryMuscles: ['chest', 'shoulders'],
    equipment: ['bodyweight'],
    movementType: 'compound',
    difficulty: 'intermediate',
    category: 'strength',
    instructions:
      'Get into a push-up position with your hands together under your chest, forming a diamond shape with your index fingers and thumbs. Lower your chest to your hands by bending your elbows. Push back up to full arm extension.',
    tips:
      'Keep your elbows close to your body as you lower down. If the close hand position bothers your wrists, widen them slightly while keeping a narrow base.',
    defaultSets: 3,
    defaultReps: '10-15',
  },

  // More quad
  {
    id: 'sissy-squat',
    name: 'Sissy Squat',
    primaryMuscle: 'quadriceps',
    secondaryMuscles: [],
    equipment: ['bodyweight'],
    movementType: 'isolation',
    difficulty: 'advanced',
    category: 'strength',
    instructions:
      'Stand holding onto a support for balance. Lean back while bending your knees, letting your knees travel forward and your heels lift off the ground. Lower until you feel an intense stretch in your quads, then push yourself back up.',
    tips:
      'This is an advanced quad isolation movement. Start by only going partway down and increase depth as your knees adapt to the stress.',
    defaultSets: 3,
    defaultReps: '8-12',
  },

  // More hamstring
  {
    id: 'dumbbell-romanian-deadlift',
    name: 'Dumbbell Romanian Deadlift',
    primaryMuscle: 'hamstrings',
    secondaryMuscles: ['glutes', 'back'],
    equipment: ['dumbbells'],
    movementType: 'compound',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Stand holding dumbbells in front of your thighs with a neutral grip. Hinge at the hips and push them back, lowering the dumbbells along your legs while keeping a slight knee bend. Return to standing by contracting your hamstrings and glutes.',
    tips:
      'Dumbbells allow a more natural arm path than a barbell. Keep the weights close to your body and your back flat throughout.',
    defaultSets: 3,
    defaultReps: '10-12',
  },

  // More glutes
  {
    id: 'single-leg-hip-thrust',
    name: 'Single-Leg Hip Thrust',
    primaryMuscle: 'glutes',
    secondaryMuscles: ['hamstrings', 'core'],
    equipment: ['bodyweight'],
    movementType: 'isolation',
    difficulty: 'intermediate',
    category: 'strength',
    instructions:
      'Set up as for a standard hip thrust with your upper back on a bench. Extend one leg out in front of you and drive through the planted foot to raise your hips until your body forms a straight line. Lower slowly and repeat before switching legs.',
    tips:
      'The single-leg version is great for correcting strength imbalances. Keep your hips level and avoid letting them tilt to one side.',
    defaultSets: 3,
    defaultReps: '10 each leg',
  },

  // More core
  {
    id: 'side-plank',
    name: 'Side Plank',
    primaryMuscle: 'core',
    secondaryMuscles: ['shoulders'],
    equipment: ['bodyweight'],
    movementType: 'isolation',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Lie on your side and prop yourself up on your forearm with your elbow directly under your shoulder. Lift your hips off the ground so your body forms a straight line from head to feet. Hold this position for the prescribed time.',
    tips:
      'Stack your feet or stagger them for balance. Squeeze your obliques and glutes to maintain the straight line and prevent your hips from dropping.',
    defaultSets: 3,
    defaultReps: '30s each side',
  },
  {
    id: 'v-ups',
    name: 'V-Ups',
    primaryMuscle: 'core',
    secondaryMuscles: [],
    equipment: ['bodyweight'],
    movementType: 'isolation',
    difficulty: 'intermediate',
    category: 'strength',
    instructions:
      'Lie flat on your back with arms extended overhead and legs straight. Simultaneously raise your legs and torso toward each other, reaching your hands toward your toes to form a V shape. Lower both your upper and lower body back to the floor under control.',
    tips:
      'Keep your legs and arms straight throughout the movement. If this is too challenging, bend your knees and perform tuck-ups as a regression.',
    defaultSets: 3,
    defaultReps: '12-15',
  },
  {
    id: 'woodchop',
    name: 'Cable Woodchop',
    primaryMuscle: 'core',
    secondaryMuscles: ['shoulders'],
    equipment: ['cables'],
    movementType: 'compound',
    difficulty: 'intermediate',
    category: 'strength',
    instructions:
      'Set a cable pulley to the highest position and stand sideways to the machine. Grab the handle with both hands and pull it down and across your body in a chopping motion, rotating your torso. Control the return to the start.',
    tips:
      'The power comes from your core rotation, not your arms. Keep your arms relatively straight and pivot through your hips and torso.',
    defaultSets: 3,
    defaultReps: '12 each side',
  },

  // Resistance band exercises
  {
    id: 'band-pull-apart',
    name: 'Band Pull-Apart',
    primaryMuscle: 'back',
    secondaryMuscles: ['shoulders'],
    equipment: ['resistance_bands'],
    movementType: 'isolation',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Hold a resistance band in front of you at shoulder height with arms extended and hands shoulder-width apart. Pull the band apart by squeezing your shoulder blades together until the band touches your chest. Return slowly to the start.',
    tips:
      'This is an excellent warm-up or accessory exercise for shoulder health. Keep your shoulders down and away from your ears throughout.',
    defaultSets: 3,
    defaultReps: '15-20',
  },
  {
    id: 'band-face-pull',
    name: 'Band Face Pull',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['back'],
    equipment: ['resistance_bands'],
    movementType: 'isolation',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Anchor a resistance band at head height. Grab both ends with an overhand grip and step back until there is tension. Pull the band toward your face, separating your hands as you pull and squeezing your rear delts. Return to the start.',
    tips:
      'Keep your elbows high and drive them back behind your ears. This is a great prehab exercise to include in every upper body session.',
    defaultSets: 3,
    defaultReps: '15-20',
  },
  {
    id: 'banded-squat',
    name: 'Banded Squat',
    primaryMuscle: 'quadriceps',
    secondaryMuscles: ['glutes', 'hamstrings'],
    equipment: ['resistance_bands'],
    movementType: 'compound',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Stand on a resistance band with feet shoulder-width apart and hold the top of the band at shoulder height. Squat down by pushing your hips back and bending your knees until your thighs are parallel to the floor. Stand back up against the band resistance.',
    tips:
      'The band provides increasing resistance as you stand, challenging the top portion of the squat more. Push your knees out against the band to maintain proper tracking.',
    defaultSets: 3,
    defaultReps: '12-15',
  },

  // Kettlebell exercises
  {
    id: 'kettlebell-goblet-squat',
    name: 'Kettlebell Goblet Squat',
    primaryMuscle: 'quadriceps',
    secondaryMuscles: ['glutes', 'core'],
    equipment: ['kettlebell'],
    movementType: 'compound',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Hold a kettlebell by the horns at chest height with elbows pointing down. Squat by pushing your hips back and bending your knees until your elbows touch the insides of your knees. Drive through your heels to stand.',
    tips:
      'The kettlebell position helps you maintain an upright torso naturally. Use your elbows to push your knees outward at the bottom position.',
    defaultSets: 3,
    defaultReps: '10-12',
  },
  {
    id: 'kettlebell-turkish-get-up',
    name: 'Turkish Get-Up',
    primaryMuscle: 'full_body',
    secondaryMuscles: ['core', 'shoulders', 'glutes'],
    equipment: ['kettlebell'],
    movementType: 'compound',
    difficulty: 'advanced',
    category: 'strength',
    instructions:
      'Lie on your back holding a kettlebell in one hand with arm extended above you. Through a series of controlled movements, transition from lying down to standing while keeping the kettlebell locked out overhead. Reverse the steps to return to the floor.',
    tips:
      'Learn each phase separately before combining them. Keep your eyes on the kettlebell throughout the entire movement for stability and safety.',
    defaultSets: 3,
    defaultReps: '3 each side',
  },
  {
    id: 'kettlebell-snatch',
    name: 'Kettlebell Snatch',
    primaryMuscle: 'full_body',
    secondaryMuscles: ['shoulders', 'back', 'glutes', 'hamstrings'],
    equipment: ['kettlebell'],
    movementType: 'compound',
    difficulty: 'advanced',
    category: 'cardio',
    instructions:
      'Start with the kettlebell between your legs in a hinged position. Swing it back, then drive your hips forward to swing the kettlebell up in one fluid motion. As it reaches face height, punch your hand through the handle to catch it overhead in a locked-out position.',
    tips:
      'The snatch is a progression from the swing and clean. Master those movements first. Tame the arc by keeping the bell close to your body on the way up.',
    defaultSets: 3,
    defaultReps: '8 each arm',
  },

  // More variety
  {
    id: 'box-jump',
    name: 'Box Jump',
    primaryMuscle: 'quadriceps',
    secondaryMuscles: ['glutes', 'calves', 'hamstrings'],
    equipment: ['bodyweight'],
    movementType: 'compound',
    difficulty: 'intermediate',
    category: 'plyometric',
    instructions:
      'Stand facing a sturdy box or platform. Dip into a quarter squat and swing your arms to explosively jump onto the box. Land softly with both feet flat on top and stand up fully. Step back down carefully.',
    tips:
      'Focus on landing softly with bent knees to absorb the impact. Start with a lower box and increase height as your confidence and power grow.',
    defaultSets: 3,
    defaultReps: '8-10',
  },
  {
    id: 'jump-squat',
    name: 'Jump Squat',
    primaryMuscle: 'quadriceps',
    secondaryMuscles: ['glutes', 'calves'],
    equipment: ['bodyweight'],
    movementType: 'compound',
    difficulty: 'intermediate',
    category: 'plyometric',
    instructions:
      'Stand with feet shoulder-width apart. Lower into a squat, then explode upward, jumping as high as possible while swinging your arms overhead. Land softly back in the squat position and immediately repeat.',
    tips:
      'Land on the balls of your feet and absorb impact by bending your knees. Avoid locking out your knees on landing to protect your joints.',
    defaultSets: 3,
    defaultReps: '10-12',
  },
  {
    id: 'bench-dip',
    name: 'Bench Dip',
    primaryMuscle: 'triceps',
    secondaryMuscles: ['chest', 'shoulders'],
    equipment: ['bodyweight'],
    movementType: 'compound',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Sit on the edge of a bench and place your hands beside your hips. Slide your hips off the bench with legs extended or bent. Lower your body by bending your elbows until they reach about 90 degrees, then push back up.',
    tips:
      'Keep your back close to the bench to maximize tricep engagement. Bend your knees for an easier variation, or elevate your feet on another bench for more difficulty.',
    defaultSets: 3,
    defaultReps: '12-15',
  },
  {
    id: 'inverted-row',
    name: 'Inverted Row',
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps', 'core'],
    equipment: ['bodyweight'],
    movementType: 'compound',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Set a barbell in a rack at about waist height. Lie underneath it and grab the bar with an overhand grip, hands shoulder-width apart. Hang with arms extended and body straight, then pull your chest up to the bar. Lower yourself back down with control.',
    tips:
      'This is an excellent progression toward pull-ups. Adjust difficulty by raising the bar to make it easier or lowering it to make it harder.',
    defaultSets: 3,
    defaultReps: '10-12',
  },
  {
    id: 'pike-push-up',
    name: 'Pike Push-Up',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['triceps'],
    equipment: ['bodyweight'],
    movementType: 'compound',
    difficulty: 'intermediate',
    category: 'strength',
    instructions:
      'Start in a push-up position and walk your feet toward your hands, raising your hips high to form an inverted V shape. Bend your elbows to lower the top of your head toward the floor between your hands. Push back up to the starting position.',
    tips:
      'This mimics an overhead press using bodyweight. Elevate your feet on a bench to increase the difficulty and further target the shoulders.',
    defaultSets: 3,
    defaultReps: '8-12',
  },
  {
    id: 'landmine-press',
    name: 'Landmine Press',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['chest', 'triceps', 'core'],
    equipment: ['barbell'],
    movementType: 'compound',
    difficulty: 'intermediate',
    category: 'strength',
    instructions:
      'Stand at the end of a barbell secured in a landmine attachment or wedged into a corner. Hold the end of the bar at shoulder height with one or both hands. Press the bar up and forward until your arm is fully extended, then lower it back to your shoulder.',
    tips:
      'The angled pressing motion is easier on the shoulders than a straight overhead press. It is a great option for those with shoulder mobility limitations.',
    defaultSets: 3,
    defaultReps: '10 each arm',
  },
  {
    id: 'reverse-lunge',
    name: 'Reverse Lunge',
    primaryMuscle: 'quadriceps',
    secondaryMuscles: ['glutes', 'hamstrings'],
    equipment: ['bodyweight', 'dumbbells'],
    movementType: 'compound',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Stand tall with or without dumbbells at your sides. Step backward with one foot and lower your back knee toward the floor until both knees are at about 90 degrees. Push off the back foot to return to the starting position and alternate legs.',
    tips:
      'Reverse lunges are easier on the knees than forward lunges because you decelerate less. Keep your torso upright and your front shin vertical.',
    defaultSets: 3,
    defaultReps: '10 each leg',
  },
  {
    id: 'kettlebell-clean',
    name: 'Kettlebell Clean',
    primaryMuscle: 'full_body',
    secondaryMuscles: ['shoulders', 'back', 'glutes'],
    equipment: ['kettlebell'],
    movementType: 'compound',
    difficulty: 'intermediate',
    category: 'strength',
    instructions:
      'Stand over a kettlebell with feet shoulder-width apart. Hinge at the hips, grip the kettlebell, and swing it back slightly. Drive your hips forward and pull the kettlebell up close to your body, rotating your hand to catch it in the rack position at your shoulder.',
    tips:
      'Keep the kettlebell close to your body during the pull to avoid it slamming into your forearm. The clean is a prerequisite for many kettlebell pressing movements.',
    defaultSets: 3,
    defaultReps: '8 each arm',
  },
  {
    id: 'hip-abduction-machine',
    name: 'Hip Abduction Machine',
    primaryMuscle: 'glutes',
    secondaryMuscles: [],
    equipment: ['machines'],
    movementType: 'isolation',
    difficulty: 'beginner',
    category: 'strength',
    instructions:
      'Sit in the hip abduction machine with your legs inside the pads and your back against the seat. Push your legs apart against the resistance as far as comfortable, squeezing your outer glutes. Return slowly to the starting position.',
    tips:
      'Lean forward slightly to target the upper glute fibers more. Use a slow, controlled tempo rather than swinging your legs open.',
    defaultSets: 3,
    defaultReps: '15-20',
  },
  {
    id: 'dumbbell-pullover',
    name: 'Dumbbell Pullover',
    primaryMuscle: 'chest',
    secondaryMuscles: ['back', 'triceps'],
    equipment: ['dumbbells'],
    movementType: 'isolation',
    difficulty: 'intermediate',
    category: 'strength',
    instructions:
      'Lie on a flat bench holding a single dumbbell with both hands above your chest, arms slightly bent. Lower the dumbbell back over your head in an arc until you feel a stretch in your chest and lats. Pull the dumbbell back over your chest using the same arc.',
    tips:
      'Keep a slight bend in your elbows to protect the joint. This exercise effectively stretches and works both the chest and lats depending on where you focus the contraction.',
    defaultSets: 3,
    defaultReps: '10-12',
  },
  {
    id: 'cable-bicep-curl-21s',
    name: 'Cable 21s',
    primaryMuscle: 'biceps',
    secondaryMuscles: ['forearms'],
    equipment: ['cables'],
    movementType: 'isolation',
    difficulty: 'intermediate',
    category: 'strength',
    instructions:
      'Stand at a low cable with a straight bar. Perform 7 reps from the bottom to the halfway point, then 7 reps from halfway to the top, and finally 7 full-range-of-motion reps. This totals 21 reps per set.',
    tips:
      'The partial ranges hit different portions of the strength curve. Use lighter weight than your normal curl as the total volume is very high per set.',
    defaultSets: 3,
    defaultReps: '21',
  },
  {
    id: 'rope-climb',
    name: 'Rope Climb',
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps', 'forearms', 'core'],
    equipment: ['bodyweight'],
    movementType: 'compound',
    difficulty: 'advanced',
    category: 'strength',
    instructions:
      'Grip the rope above your head and use your feet to clamp the rope by wrapping it around one foot and stepping on it with the other. Pull yourself up with your arms while pushing up with your legs, then re-clamp your feet higher. Repeat until you reach the top.',
    tips:
      'Learn the foot clamp technique before attempting to climb. It takes the majority of the work off your arms and makes climbing sustainable.',
    defaultSets: 3,
    defaultReps: '2-3 climbs',
  },
];

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Find a single exercise by its unique ID.
 */
export function getExerciseById(id: string): Exercise | undefined {
  return EXERCISES.find((exercise) => exercise.id === id);
}

/**
 * Get all exercises that target a specific primary muscle group.
 */
export function getExercisesByMuscle(muscle: MuscleGroup): Exercise[] {
  return EXERCISES.filter((exercise) => exercise.primaryMuscle === muscle);
}

/**
 * Get all exercises that can be performed with any of the provided equipment types.
 * Returns exercises where at least one of the exercise's equipment types matches
 * at least one of the provided types.
 */
export function getExercisesByEquipment(equipment: EquipmentType[]): Exercise[] {
  return EXERCISES.filter((exercise) =>
    exercise.equipment.some((eq) => equipment.includes(eq))
  );
}

/**
 * Filter exercises by multiple criteria. All provided filters must match (AND logic).
 * Within array filters (muscles, equipment), any match satisfies the condition (OR logic).
 */
export function filterExercises(filters: {
  muscles?: MuscleGroup[];
  equipment?: EquipmentType[];
  difficulty?: Exercise['difficulty'];
  movementType?: Exercise['movementType'];
}): Exercise[] {
  return EXERCISES.filter((exercise) => {
    if (
      filters.muscles &&
      filters.muscles.length > 0 &&
      !filters.muscles.includes(exercise.primaryMuscle)
    ) {
      return false;
    }

    if (
      filters.equipment &&
      filters.equipment.length > 0 &&
      !exercise.equipment.some((eq) => filters.equipment!.includes(eq))
    ) {
      return false;
    }

    if (filters.difficulty && exercise.difficulty !== filters.difficulty) {
      return false;
    }

    if (filters.movementType && exercise.movementType !== filters.movementType) {
      return false;
    }

    return true;
  });
}
