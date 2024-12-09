import csv
import json
from collections import defaultdict

# Initialize data structures
nodes = {}
links = defaultdict(lambda: defaultdict(int))
publications = defaultdict(list)

# Function to extract country from affiliation
def extract_country(affiliation):
    if ',' in affiliation:
        return affiliation.split(',')[-1].strip()
    return affiliation.strip()

# Read CSV file
with open('data_scopus.csv', 'r', encoding='utf-8') as file:
    csv_reader = csv.DictReader(file)
    for row in csv_reader:
        authors = row['Authors'].split(',')
        affiliations = row['Authors with affiliations'].split(';')
        title = row['Title']
        
        # Process each author
        for i, author in enumerate(authors):
            author = author.strip()
            if author not in nodes:
                affiliation = affiliations[i] if i < len(affiliations) else 'Unknown'
                country = extract_country(affiliation)
                nodes[author] = {
                    'id': author,
                    'affiliation': affiliation,
                    'country': country,
                    'publications': 1,
                    'titles': []
                }
            else:
                nodes[author]['publications'] += 1
            
            # Add publication title to author's titles
            nodes[author]['titles'].append(title)
            
            # Create links between all co-authors
            for j, co_author in enumerate(authors):
                co_author = co_author.strip()
                if co_author != author:
                    links[author][co_author] += 1

# Convert nodes to list
nodes_list = list(nodes.values())

# Convert links to list
links_list = []
for source, targets in links.items():
    for target, value in targets.items():
        links_list.append({
            'source': source,
            'target': target,
            'value': value
        })

# Create final JSON structure
json_data = {
    'nodes': nodes_list,
    'links': links_list
}

# Write JSON file
with open('author_network.json', 'w', encoding='utf-8') as json_file:
    json.dump(json_data, json_file, ensure_ascii=False, indent=2)

print("JSON file 'author_network.json' has been created successfully.")