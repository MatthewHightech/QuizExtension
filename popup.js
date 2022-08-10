        // map of urls for various apis
        const urls = {
            summary: 'https://text-analysis12.p.rapidapi.com/summarize-text/api/v1.1',
            keywords: 'https://text-analysis12.p.rapidapi.com/ner/api/v1.1',
            distractors_type: '',
            distractors_list: ''
        };
        
        // map of request options for various apis
        const options = {
            summary: {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'X-RapidAPI-Key': 'd711f074c0msh909b94423c76149p12fb01jsneab74566b2dc',
                    'X-RapidAPI-Host': 'text-analysis12.p.rapidapi.com'
                },
            },
            keywords: {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'X-RapidAPI-Key': 'd711f074c0msh909b94423c76149p12fb01jsneab74566b2dc',
                    'X-RapidAPI-Host': 'text-analysis12.p.rapidapi.com'
                },
            },
            distractors: {
                method: 'GET'
            }
        };

// params: a url and headers object
// return: the JSON response from the url
async function getData(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  return data;
}

// params: the text of the article/notes
// return: an array of sentences that are the summary of the text
async function getSummary(text) {
    options.summary.body = '{"language":"english","summary_percent":100,"text":"'+ text + '"}'
    const summary = await getData(urls.summary, options.summary)
    console.log(summary);
    return summary.sentences
}

// params: array of sentances
// return: an array of keywords that corrispond to the sentances
async function getKeywords(summary) {
    const keywords = [];

    for (let i = 0; i < summary.length; i++) {
        options.keywords.body = '{"language":"english","text":"'+ summary[i] + '"}';

        const keyword_list = await getData(urls.keywords, options.keywords);
        console.log(keyword_list);
        if (keyword_list.ner.length == 0) {
            console.log("No keywords");
            keywords.push(null);
        } else {
            keywords.push(keyword_list.ner[Math.floor(Math.random()*keyword_list.ner.length)].entity);
        }
    }
    return keywords;
}

// params: the keyword of interest
// return: the type of word that the keyword is (i.e Apple is a type of Fruit)
async function getDistractorType(keyword) {
    urls.distractors_type = 'https://api.conceptnet.io/c/en/' + keyword.toLowerCase().replace(" ", "_") + '?offset=0&limit=2000'
    const res = await getData(urls.distractors_type, options.distractors);
    const edges = res.edges;
    for(let i = 0; i < edges.length; i++) {
        if(edges[i]["@id"].includes("IsA")) {
            const type = edges[i]["end"]["label"];
            return type;
        }
    }
    return null;
}

// params: the category of words the keyword is, and the keyword
// return: a list of 3 similar words
async function getDistractorList(distractor_type, keyword) {
    if (distractor_type == null) {
        console.log("No distractor type");
        return null;
    }
    console.log("Keyword: ", keyword)
    console.log("Distractor type: ", distractor_type)
    const distractor_list = [keyword.toLowerCase()];
    urls.distractors_list = 'https://api.conceptnet.io/c/en/' + distractor_type.toLowerCase().replace(" ", "_").replace("a ", "") + '?offset=0&limit=2000'
    const res = await getData(urls.distractors_list, options.distractors);
    const edges = res.edges;
    for(let i = 0; i < edges.length; i++) {
        if(edges[i]["@id"].includes("IsA")) {
            const type = edges[i]["end"]["label"];
            if (type == distractor_type) {
                const fakeAnswer = edges[i]["start"]["label"];
                if (!distractor_list.includes(fakeAnswer.toLowerCase())) {
                    distractor_list.push(fakeAnswer);
                }
                if (distractor_list.length == 10 || distractor_list.length == edges.length-1) {
                    break;
                }
            }
        }
    }
    distractor_list.shift();
    console.log("Distractor List: ", distractor_list);
    const finalList = [];
    for (let i = 0; i < distractor_list.length; i++) {
        const randomIndex = Math.floor(Math.random() * distractor_list.length);
        if (!finalList.includes(distractor_list[randomIndex])) {
            finalList.push(distractor_list[randomIndex]);
        }
        if (finalList.length == 3) {
            break;
        }
    }
    console.log("Final List: ", finalList);
    
    return finalList;
}

// params: an array of the keywords for each sentence
// return: an array of lists of distractors for each sentence
async function getDistractors(keywords) {
    const distractors = [];
    for (let i = 0; i < keywords.length; i++) {
        if (keywords[i] != null) {
            const distractor_type = await getDistractorType(keywords[i].toLowerCase());
            const distractor_list = await getDistractorList(distractor_type, keywords[i].toLowerCase());
            if (distractor_list == null || distractor_list.length < 3) {
                console.log("No or to small distractor list");
                distractors.push(null);
            } else {
                distractors.push(distractor_list);
            }
        } else {
            console.log("No keyword");
            distractors.push(null);
        }
    }
    return distractors;
}

// params: an array of the keywords for each sentence and the array of distractors for each sentence
// return: an array for each sentance of all the answers to the question
function buildFinalAnswers(keywords, distractors) {
    const finalAnswers = [];
    for (let i = 0; i < keywords.length; i++) {
        let finalAnswer = null;
        if (distractors[i] != null) {
            distractors[i].splice(Math.floor(Math.random()*distractors[i].length), 0, keywords[i]);
            finalAnswer = distractors[i];
        }
        finalAnswers.push(finalAnswer);
    }
    return finalAnswers;
}

function highlightCorrectAnswers(keywords) {
    const questions = document.getElementsByClassName("q");  
    console.log(keywords)
    for (let i = 0; i < questions.length; i++) {
        let index = questions[i].classList.item(1).replace(/\D/g, '');
        const answers = questions[i].getElementsByClassName("options");
        console.log(index)
        console.log(keywords[index]);
        for (let j = 0; j < answers.length; j++) {
            if (answers[j].textContent == keywords[index]) {
                answers[j].style.color = "green";
                answers[j].style.fontWeight = 700;
            }
        }
    }

}

function loadQuestionsIntoDOM(summary, keywords, finalAnswers) {
    const questionContainer = document.getElementById("question-container");
    let validQuestions = 0;
    questionContainer.innerHTML = "";
    for (let i = 0; i < summary.length; i++) {
        if (finalAnswers[i] == null || finalAnswers[i].length < 4) {
            continue;
        }
        validQuestions++;
        const question = document.createElement("div");
        question.className = "q question-"+i;
        question.innerHTML = summary[i].replace(keywords[i], "__________");

        const answers = document.createElement("div");
        answers.id = "options";
        for (let j = 0; j < finalAnswers[i].length; j++) {
            const answer = document.createElement("label");
            const text = document.createTextNode(finalAnswers[i][j]);
            answer.appendChild(text);
            answer.className = "options"
            const input = document.createElement("input");
            input.type = "radio";
            input.name = "radio"+i;
            const span = document.createElement("span");
            span.className = "checkmark";
            answer.appendChild(input);
            answer.appendChild(span);
            answers.appendChild(answer);
        }
        question.appendChild(answers);
        questionContainer.appendChild(question);

    }

    if (validQuestions == 0) {
        questionContainer.innerHTML = "No questions found";
    } else {
        const submitButton = document.createElement("button");
        submitButton.id = "submit-button";
        submitButton.innerHTML = "Submit";
        submitButton.className = "btn btn-success";
        submitButton.onclick = function() {
            highlightCorrectAnswers(keywords);
        }
        questionContainer.appendChild(submitButton);
    }
}

function cleanText(text) {
    return text.replace(/\n/g, " ").replace(/\s\s+/g, " ").replace(/\s+/g, " ").replace(/\s+$/g, "").replace(/^\s+/g, "");
}


document.addEventListener("DOMContentLoaded", () => {
    const generate = document.getElementById("generate");
    const questionContainer = document.getElementById("question-container");

    generate.addEventListener("click", async (e) => {
        const text = cleanText(document.getElementById("input_text").value);
        questionContainer.innerHTML = "Generating questions...";

        const summary = await getSummary(text);
        const keywords = await getKeywords(summary);
        const distractors = await getDistractors(keywords);
        const finalAnswers = buildFinalAnswers(keywords, distractors);
        loadQuestionsIntoDOM(summary, keywords, finalAnswers);
        console.log("Final Answers: ", finalAnswers);

    });
});
