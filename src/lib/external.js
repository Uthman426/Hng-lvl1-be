export async function fetchExternalData(name) {
  const [genderRes, ageRes, nationRes] = await Promise.all([
    fetch(`https://api.genderize.io?name=${name}`),
    fetch(`https://api.agify.io?name=${name}`),
    fetch(`https://api.nationalize.io?name=${name}`),
  ]);

  const gender = await genderRes.json();
  const age = await ageRes.json();
  const nation = await nationRes.json();

  // Edge case validation
  if (!gender.gender || gender.count === 0) {
    throw new Error("Genderize");
  }

  if (age.age === null) {
    throw new Error("Agify");
  }

  if (!nation.country || nation.country.length === 0) {
    throw new Error("Nationalize");
  }

  return { gender, age, nation };
}