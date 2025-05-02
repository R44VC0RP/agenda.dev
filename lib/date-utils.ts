export async function convertRelativeDate(relativeDate: string): Promise<{
  originalText: string;
  formattedDateTime: string;
  dateTime: Date;
}> {
  const response = await fetch('/api/convert-date', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: relativeDate }),
  });

  if (!response.ok) {
    throw new Error('Failed to convert date');
  }

  const data = await response.json();
  return {
    originalText: data.originalText,
    formattedDateTime: data.formattedDateTime,
    dateTime: new Date(data.dateTime),
  };
}
