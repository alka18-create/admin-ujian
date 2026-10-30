/**
 * Fisher-Yates shuffle algorithm
 */
export function shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * Shuffle but ensure no two adjacent elements satisfy a condition
 */
export function shuffleWithConstraint<T>(
    array: T[],
    sameGroup: (a: T, b: T) => boolean,
    maxAttempts = 10
): T[] {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const shuffled = shuffle(array);
        let hasAdjacentSameGroup = false;
        for (let i = 0; i < shuffled.length - 1; i++) {
            if (sameGroup(shuffled[i], shuffled[i + 1])) {
                hasAdjacentSameGroup = true;
                break;
            }
        }
        if (!hasAdjacentSameGroup) return shuffled;
    }
    return shuffle(array);
}
