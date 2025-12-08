import pandas as pd
import random

# Likelihoods
likelihoods = {
    'green': {'A': 36/40, 'B': 20/40},
    'red':   {'A': 4/40,  'B': 20/40}
}

def calculate_bayesian_updates(draws):
    """
    Calculate P(Box B) after each draw using Bayesian updating
    
    Args:
        draws: list of 'green' or 'red' strings
        
    Returns:
        list of tuples (draw_number, color, P(B))
    """
    prior_A = 0.5
    prior_B = 0.5
    
    results = [(0, 'Initial', prior_B)]
    
    for i, color in enumerate(draws, 1):
        # Get likelihoods
        like_A = likelihoods[color]['A']
        like_B = likelihoods[color]['B']
        
        # Total probability
        total = like_A * prior_A + like_B * prior_B
        
        # Posterior (becomes next prior)
        prior_A = (like_A * prior_A) / total
        prior_B = (like_B * prior_B) / total
        
        results.append((i, color.capitalize(), prior_B))
    
    return results

def generate_random_draws(num_draws):
    """Generate a random sequence of draws"""
    return [random.choice(['green', 'red']) for _ in range(num_draws)]

# Generate several different draw sequences
num_sequences = 5
num_draws_per_sequence = 10

print("=" * 80)
print("BAYESIAN UPDATING: P(Box B) AFTER EACH DRAW")
print("=" * 80)
print("\nBox A (Good Motor): 90% Green, 10% Red")
print("Box B (Bad Motor): 50% Green, 50% Red")
print("\n" + "=" * 80 + "\n")

all_data = []

for seq_num in range(1, num_sequences + 1):
    draws = generate_random_draws(num_draws_per_sequence)
    results = calculate_bayesian_updates(draws)
    
    print(f"SEQUENCE {seq_num}: {' → '.join([d.upper() for d in draws])}")
    print("-" * 80)
    
    # Create DataFrame for this sequence
    df = pd.DataFrame(results, columns=['Draw #', 'Color', 'P(Box B)'])
    df['P(Box B)'] = df['P(Box B)'].apply(lambda x: f"{x:.4f} ({x*100:.2f}%)")
    
    print(df.to_string(index=False))
    print("\n" + "=" * 80 + "\n")
    
    # Store for combined table
    for draw_num, color, prob in results[1:]:  # Skip initial
        all_data.append({
            'Sequence': seq_num,
            'Draw #': draw_num,
            'Color': color,
            'P(Box B)': prob
        })

# Create summary table showing all sequences side by side
print("SUMMARY: P(Box B) COMPARISON ACROSS ALL SEQUENCES")
print("=" * 80)

summary_df = pd.DataFrame(all_data)
pivot_df = summary_df.pivot_table(
    values='P(Box B)', 
    index='Draw #', 
    columns='Sequence',
    aggfunc='first'
)

# Format as percentages
for col in pivot_df.columns:
    pivot_df[col] = pivot_df[col].apply(lambda x: f"{x*100:.2f}%")

print(pivot_df.to_string())
print("\n" + "=" * 80)

# Calculate some statistics
print("\nINSIGHTS:")
print("-" * 80)

final_probs = summary_df[summary_df['Draw #'] == num_draws_per_sequence]['P(Box B)'].values
print(f"Average final P(Box B) after {num_draws_per_sequence} draws: {final_probs.mean()*100:.2f}%")
print(f"Range: {final_probs.min()*100:.2f}% to {final_probs.max()*100:.2f}%")

red_draws = summary_df[summary_df['Color'] == 'Red']
if len(red_draws) > 0:
    avg_prob_after_red = red_draws.groupby('Draw #')['P(Box B)'].mean()
    print(f"\nAverage P(Box B) after drawing RED: {avg_prob_after_red.mean()*100:.2f}%")

green_draws = summary_df[summary_df['Color'] == 'Green']
if len(green_draws) > 0:
    avg_prob_after_green = green_draws.groupby('Draw #')['P(Box B)'].mean()
    print(f"Average P(Box B) after drawing GREEN: {avg_prob_after_green.mean()*100:.2f}%")

print("\n" + "=" * 80)
