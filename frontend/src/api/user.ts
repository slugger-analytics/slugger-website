export const addFavorite = async (userId: number, widgetId: number) => {
    try {
        const response = await fetch(`http://alpb-analytics.com/api/user-favorites/add-favorite/${userId}`, {
            method: 'PATCH',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ widgetId })
        });
        if (!response.ok) {
            throw new Error(`Error: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error adding widget to favorites:", error);
        throw error;
    }
}

export const removeFavorite = async (userId: number, widgetId: number) => {
    try {
        const response = await fetch(`http://alpb-analytics.com/api/user-favorites/remove-favorite/${userId}`, {
            method: 'PATCH',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ widgetId })
        });
        if (!response.ok) {
            throw new Error(`Error: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error adding widget to favorites:", error);
        throw error;
    }
}

export const getFavorites = async (userId: number) => {
    try {
        const response = await fetch(`http://alpb-analytics.com/api/user-favorites/${userId}`);
        const jsoned = await response.json();
        const data = jsoned.data;
        return data;
    } catch (error) {
        console.error("Error fetching favorite widgets:", error);
        throw error;
    }
}