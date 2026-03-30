export function surveyQuestionKey(questionId: number, propertyTypeId: number): string {
  return `${questionId}_${propertyTypeId}`;
}
