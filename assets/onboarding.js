import { getProfile, updateProfile } from "./auth.js";

// Q1 (pills) - placeholder categories
export const Q1_TAGS = [
  { id: "q1_a", label: "Category A" },
  { id: "q1_b", label: "Category B" },
  { id: "q1_c", label: "Category C" },
  { id: "q1_d", label: "Category D" },
];

// Q2 (pills) - placeholder categories
export const Q2_TAGS = [
  { id: "q2_a", label: "Option 1" },
  { id: "q2_b", label: "Option 2" },
  { id: "q2_c", label: "Option 3" },
  { id: "q2_d", label: "Option 4" },
];

// Q3 (slider) - placeholder scale meaning
export const Q3_SLIDER = {
  min: 0,
  max: 10,
  step: 1,
  defaultValue: 5,
};

export async function loadOnboardingState() {
  const profile = await getProfile();
  return {
    q1Selections: profile.q1Selections || [],
    q2Selections: profile.q2Selections || [],
    q3Scale: Number.isFinite(profile.q3Scale) ? profile.q3Scale : Q3_SLIDER.defaultValue,
  };
}

export async function saveOnboardingState(state) {
  await updateProfile({
    q1Selections: state.q1Selections,
    q2Selections: state.q2Selections,
    q3Scale: state.q3Scale,
    onboardingComplete: true,
  });
}
