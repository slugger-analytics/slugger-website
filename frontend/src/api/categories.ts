const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function getCategories() {
  try {
    const response = await fetch(`${API_URL}/api/widget-categories`);
    const res = await response.json();

    if (!res.success) {
      throw new Error(res.message);
    }

    const formattedData = res.data!.map(
      (category: { id: number; name: string; hex_code: string }) => ({
        id: category.id,
        name: category.name,
        hexCode: category.hex_code,
      }),
    );
    return formattedData;
  } catch (error) {
    console.error("Error fetching categories: ", error);
    throw error;
  }
}
