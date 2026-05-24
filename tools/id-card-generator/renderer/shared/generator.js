import { AREA_CODES } from './area-codes.js';

const WEIGHTS = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
const CHECK_CHARS = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];

export const GENDER = {
  MALE: 'male',
  FEMALE: 'female',
  RANDOM: 'random',
};

const GENDER_LABEL = {
  [GENDER.MALE]: '男',
  [GENDER.FEMALE]: '女',
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPick(list) {
  return list[randomInt(0, list.length - 1)];
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatDate(date) {
  return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}`;
}

function formatDisplayDate(dateStr) {
  return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
}

function subtractYears(date, years) {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() - years);
  return result;
}

function randomBirthDate(minAge, maxAge) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const latestBirth = subtractYears(today, minAge);
  const earliestBirth = subtractYears(today, maxAge);

  const startMs = earliestBirth.getTime();
  const endMs = latestBirth.getTime();
  return formatDate(new Date(startMs + Math.random() * (endMs - startMs)));
}

function randomSequence(gender) {
  if (gender === GENDER.MALE) {
    const n = randomInt(0, 499);
    return String(n * 2 + 1).padStart(3, '0');
  }
  if (gender === GENDER.FEMALE) {
    const n = randomInt(1, 499);
    return String(n * 2).padStart(3, '0');
  }
  return String(randomInt(1, 999)).padStart(3, '0');
}

function inferGender(sequence) {
  if (Number(sequence.at(-1)) % 2 === 1) return GENDER.MALE;
  return GENDER.FEMALE;
}

export function calcCheckDigit(body17) {
  const sum = body17.split('').reduce((acc, digit, index) => acc + Number(digit) * WEIGHTS[index], 0);
  return CHECK_CHARS[sum % 11];
}

export function generateIdCard({ gender = GENDER.RANDOM, minAge = 18, maxAge = 60 } = {}) {
  const safeMinAge = Math.max(0, Math.min(minAge, maxAge));
  const safeMaxAge = Math.max(safeMinAge, maxAge);

  const area = randomPick(AREA_CODES);
  const birthDate = randomBirthDate(safeMinAge, safeMaxAge);
  const sequence = randomSequence(gender);
  const body = `${area.code}${birthDate}${sequence}`;
  const checkDigit = calcCheckDigit(body);
  const resolvedGender = gender === GENDER.RANDOM ? inferGender(sequence) : gender;

  return {
    id: body + checkDigit,
    areaCode: area.code,
    areaName: area.name,
    birthDate,
    birthDateDisplay: formatDisplayDate(birthDate),
    gender: resolvedGender,
    genderLabel: GENDER_LABEL[resolvedGender],
  };
}
