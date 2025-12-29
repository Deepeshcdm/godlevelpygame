// Python Quiz Data Structure
export interface PythonQuiz {
  id: string;
  program: string;
  expectedOutput: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

// Quiz bank for Variables and Print concept (Elder Mystic)
const variablesQuizzes: PythonQuiz[] = [
  {
    id: 'vars_1',
    program:
      `level = 1
message = "Current level:"
print(message, level)`,
    expectedOutput: "Current level: 1",
    difficulty: 'beginner'
  },
  {
    id: 'vars_2',
    program:
      `name = "Hero"
age = 20
print("The", name, "is", age, "years old.")`,
    expectedOutput: "The Hero is 20 years old.",
    difficulty: 'beginner'
  },
  {
    id: 'vars_3',
    program:
      `health = 100
damage = 15
health = health - damage
print("Health remaining:", health)`,
    expectedOutput: "Health remaining: 85",
    difficulty: 'intermediate'
  },
  {
    id: 'vars_4',
    program:
      `first = "Mystic"
second = "Realms"
game_name = first + " " + second
print(game_name)`,
    expectedOutput: "Mystic Realms",
    difficulty: 'intermediate'
  },
  {
    id: 'vars_5',
    program:
      `gold = 50
gems = 3
total_value = gold + (gems * 25)
print("Inventory value:", total_value)`,
    expectedOutput: "Inventory value: 125",
    difficulty: 'advanced'
  }
];

// Quiz bank for If Statements concept (Merchant Ryla)
const ifStatementsQuizzes: PythonQuiz[] = [
  {
    id: 'if_1',
    program:
      `has_key = False
if has_key:
  print("Door unlocked")
else:
  print("Key needed")`,
    expectedOutput: "Key needed",
    difficulty: 'beginner'
  },
  {
    id: 'if_2',
    program:
      `gold = 75
if gold >= 100:
  print("You can afford the sword")
else:
  print("Not enough gold")`,
    expectedOutput: "Not enough gold",
    difficulty: 'beginner'
  },
  {
    id: 'if_3',
    program:
      `health = 30
if health < 20:
  print("Critical health!")
elif health < 50:
  print("Low health!")
else:
  print("Health OK")`,
    expectedOutput: "Low health!",
    difficulty: 'intermediate'
  },
  {
    id: 'if_4',
    program:
      `has_shield = True
has_armor = False
if has_shield and has_armor:
  print("Fully protected")
elif has_shield or has_armor:
  print("Partially protected")
else:
  print("Unprotected")`,
    expectedOutput: "Partially protected",
    difficulty: 'intermediate'
  },
  {
    id: 'if_5',
    program:
      `enemy_defeated = True
quest_completed = False
reward = 100

if enemy_defeated:
  if quest_completed:
    print("Full reward:", reward)
  else:
    print("Partial reward:", reward//2)`,
    expectedOutput: "Partial reward: 50",
    difficulty: 'advanced'
  }
];

// Quiz bank for Loops concept (Ranger Thorne)
const loopsQuizzes: PythonQuiz[] = [
  {
    id: 'loops_1',
    program:
      `count = 0
for i in range(3):
  count = count + 1
print(count)`,
    expectedOutput: "3",
    difficulty: 'beginner'
  },
  {
    id: 'loops_2',
    program:
      `total = 0
for num in [5, 10, 15]:
  total = total + num
print("Sum:", total)`,
    expectedOutput: "Sum: 30",
    difficulty: 'beginner'
  },
  {
    id: 'loops_3',
    program:
      `inventory = ["sword", "shield", "potion"]
for item in inventory:
  if item == "potion":
    print("Found healing item!")
    break`,
    expectedOutput: "Found healing item!",
    difficulty: 'intermediate'
  },
  {
    id: 'loops_4',
    program:
      `power = 1
for i in range(4):
  power = power * 2
print("Spell power:", power)`,
    expectedOutput: "Spell power: 16",
    difficulty: 'intermediate'
  },
  {
    id: 'loops_5',
    program:
      `treasures = 0
locations = ["cave", "forest", "mountain"]
for place in locations:
  if place == "forest" or place == "mountain":
    treasures += 2
  else:
    treasures += 1
print("Treasures found:", treasures)`,
    expectedOutput: "Treasures found: 5",
    difficulty: 'advanced'
  }
];

// Quiz bank for Functions concept (Alchemist Vex)
const functionsQuizzes: PythonQuiz[] = [
  {
    id: 'func_1',
    program:
      `def add(a, b):
  return a + b
result = add(5, 3)
print(result)`,
    expectedOutput: "8",
    difficulty: 'beginner'
  },
  {
    id: 'func_2',
    program:
      `def greet(name):
  return "Hello, " + name
message = greet("adventurer")
print(message)`,
    expectedOutput: "Hello, adventurer",
    difficulty: 'beginner'
  },
  {
    id: 'func_3',
    program:
      `def calculate_damage(base, multiplier=1):
  return base * multiplier
print(calculate_damage(10, 2))`,
    expectedOutput: "20",
    difficulty: 'intermediate'
  },
  {
    id: 'func_4',
    program:
      `def craft_potion(herb1, herb2):
  if herb1 == "mushroom" and herb2 == "flower":
    return "Healing potion"
  else:
    return "Failed mixture"
print(craft_potion("mushroom", "flower"))`,
    expectedOutput: "Healing potion",
    difficulty: 'intermediate'
  },
  {
    id: 'func_5',
    program:
      `def apply_effects(character, effects):
  result = character
  for effect in effects:
    result += " with " + effect
  return result
print(apply_effects("Wizard", ["frost", "speed"]))`,
    expectedOutput: "Wizard with frost with speed",
    difficulty: 'advanced'
  }
];

// Export quiz banks organized by topic
export const pythonQuizBank = {
  variables: variablesQuizzes,
  if_statements: ifStatementsQuizzes,
  loops: loopsQuizzes,
  functions: functionsQuizzes
};

// Helper function to get a random quiz from a specific topic
export function getRandomQuizForTopic(topic: keyof typeof pythonQuizBank): PythonQuiz {
  const quizzes = pythonQuizBank[topic];
  const randomIndex = Math.floor(Math.random() * quizzes.length);
  return quizzes[randomIndex];
}

// Helper function to get a dynamic quiz (excluding completed ones)
export function getDynamicQuizForTopic(topic: keyof typeof pythonQuizBank, completedQuizIds: string[]): PythonQuiz | null {
  const quizzes = pythonQuizBank[topic];
  const availableQuizzes = quizzes.filter(quiz => !completedQuizIds.includes(quiz.id));

  if (availableQuizzes.length === 0) {
    // If all quizzes are completed, reset and allow retaking any quiz
    const randomIndex = Math.floor(Math.random() * quizzes.length);
    return quizzes[randomIndex];
  }

  const randomIndex = Math.floor(Math.random() * availableQuizzes.length);
  return availableQuizzes[randomIndex];
}

// Helper function to get a quiz by ID
export function getQuizById(topic: keyof typeof pythonQuizBank, id: string): PythonQuiz | undefined {
  return pythonQuizBank[topic].find(quiz => quiz.id === id);
} 