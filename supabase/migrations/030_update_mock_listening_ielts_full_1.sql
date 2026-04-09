-- ============================================================
-- Migration 030: Update listening exam to provided 4-part set
-- ============================================================

WITH listening_payload AS (
  SELECT
    '{
      "title": "Listening",
      "blocks": [
        { "type": "text", "html": "<h3>PART 1 — Questions 1-10</h3><p>Complete the notes below. Write <strong>ONE WORD AND/OR A NUMBER</strong> for each answer.</p><p><a href=\"https://www.youtube.com/watch?v=mNaooUv6nhc&list=PLQoFvrOxWqR4cqAYBjrv9petggWGB_ATM&index=1\" target=\"_blank\" rel=\"noopener noreferrer\">Nghe audio Part 1</a></p>" },
        { "type": "text", "html": "<h3>PART 2 — Questions 11-20</h3><p>Choose the correct letter, A, B or C (Questions 11-14).<br/>Choose SIX answers from the box, A-H (Questions 15-20).</p><p><a href=\"https://www.youtube.com/watch?v=6hwBW39h5uI&list=PLQoFvrOxWqR4cqAYBjrv9petggWGB_ATM&index=2\" target=\"_blank\" rel=\"noopener noreferrer\">Nghe audio Part 2</a></p>" },
        { "type": "text", "html": "<h3>PART 3 — Questions 21-30</h3><p>Questions 21-22: choose TWO letters, A-E.<br/>Questions 23-27: choose FIVE answers from the box, A-G.<br/>Questions 28-30: choose the correct letter, A, B or C.</p><p><a href=\"https://www.youtube.com/watch?v=oGKnYMM1fRE&list=PLQoFvrOxWqR4cqAYBjrv9petggWGB_ATM&index=3\" target=\"_blank\" rel=\"noopener noreferrer\">Nghe audio Part 3</a></p>" },
        { "type": "text", "html": "<h3>PART 4 — Questions 31-40</h3><p>Complete the notes below. Write <strong>ONE WORD ONLY</strong> for each answer.</p><p><a href=\"https://www.youtube.com/watch?v=_cskUdSXwYM&list=PLQoFvrOxWqR4cqAYBjrv9petggWGB_ATM&index=4\" target=\"_blank\" rel=\"noopener noreferrer\">Nghe audio Part 4</a></p>" }
      ],
      "questions": [
        { "id": "l1", "stem": "Role: _____", "type": "text" },
        { "id": "l2", "stem": "Location: Fordham _____ Centre", "type": "text" },
        { "id": "l3", "stem": "_____ Road, Fordham", "type": "text" },
        { "id": "l4", "stem": "Work involves making _____ and reorganising them", "type": "text" },
        { "id": "l5", "stem": "Maintaining the internal _____", "type": "text" },
        { "id": "l6", "stem": "Requirement (essential): _____", "type": "text" },
        { "id": "l7", "stem": "A calm and _____ manner", "type": "text" },
        { "id": "l8", "stem": "Other info: a _____ job", "type": "text" },
        { "id": "l9", "stem": "Hours: 7.45 a.m. to _____ p.m.", "type": "text" },
        { "id": "l10", "stem": "_____ is available onsite", "type": "text" },

        { "id": "l11", "stem": "The museum building was originally", "type": "single_choice", "options": ["a factory", "a private home", "a hall of residence"] },
        { "id": "l12", "stem": "The university uses part of the museum building as", "type": "single_choice", "options": ["teaching rooms", "a research library", "administration offices"] },
        { "id": "l13", "stem": "What does the guide say about the entrance fee?", "type": "single_choice", "options": ["Visitors decide whether or not they wish to pay", "Only children and students receive a discount", "The museum charges extra for special exhibitions"] },
        { "id": "l14", "stem": "What are visitors advised to leave in the cloakroom?", "type": "single_choice", "options": ["cameras", "coats", "bags"] },
        { "id": "l15", "stem": "Four Seasons", "type": "single_choice", "options": ["Parents must supervise their children", "There are new things to see", "It is closed today", "This is only for school groups", "There is a quiz for visitors", "It features something created by students", "An expert is here today", "There is a one-way system"] },
        { "id": "l16", "stem": "Farmhouse Kitchen", "type": "single_choice", "options": ["Parents must supervise their children", "There are new things to see", "It is closed today", "This is only for school groups", "There is a quiz for visitors", "It features something created by students", "An expert is here today", "There is a one-way system"] },
        { "id": "l17", "stem": "A Year on the Farm", "type": "single_choice", "options": ["Parents must supervise their children", "There are new things to see", "It is closed today", "This is only for school groups", "There is a quiz for visitors", "It features something created by students", "An expert is here today", "There is a one-way system"] },
        { "id": "l18", "stem": "Wagon Walk", "type": "single_choice", "options": ["Parents must supervise their children", "There are new things to see", "It is closed today", "This is only for school groups", "There is a quiz for visitors", "It features something created by students", "An expert is here today", "There is a one-way system"] },
        { "id": "l19", "stem": "Bees are Magic", "type": "single_choice", "options": ["Parents must supervise their children", "There are new things to see", "It is closed today", "This is only for school groups", "There is a quiz for visitors", "It features something created by students", "An expert is here today", "There is a one-way system"] },
        { "id": "l20", "stem": "The Pond", "type": "single_choice", "options": ["Parents must supervise their children", "There are new things to see", "It is closed today", "This is only for school groups", "There is a quiz for visitors", "It features something created by students", "An expert is here today", "There is a one-way system"] },

        { "id": "l21", "stem": "Skill shown in the video (Q21)", "type": "single_choice", "options": ["solving problems", "following instructions", "working cooperatively", "learning through play", "developing hand-eye coordination"] },
        { "id": "l22", "stem": "Skill shown in the video (Q22)", "type": "single_choice", "options": ["solving problems", "following instructions", "working cooperatively", "learning through play", "developing hand-eye coordination"] },
        { "id": "l23", "stem": "Sid", "type": "single_choice", "options": ["demonstrated independence", "asked for teacher support", "developed a competitive attitude", "seemed to find the activity calming", "seemed pleased with the results", "seemed confused", "seemed to find the activity easy"] },
        { "id": "l24", "stem": "Jack", "type": "single_choice", "options": ["demonstrated independence", "asked for teacher support", "developed a competitive attitude", "seemed to find the activity calming", "seemed pleased with the results", "seemed confused", "seemed to find the activity easy"] },
        { "id": "l25", "stem": "Naomi", "type": "single_choice", "options": ["demonstrated independence", "asked for teacher support", "developed a competitive attitude", "seemed to find the activity calming", "seemed pleased with the results", "seemed confused", "seemed to find the activity easy"] },
        { "id": "l26", "stem": "Anya", "type": "single_choice", "options": ["demonstrated independence", "asked for teacher support", "developed a competitive attitude", "seemed to find the activity calming", "seemed pleased with the results", "seemed confused", "seemed to find the activity easy"] },
        { "id": "l27", "stem": "Zara", "type": "single_choice", "options": ["demonstrated independence", "asked for teacher support", "developed a competitive attitude", "seemed to find the activity calming", "seemed pleased with the results", "seemed confused", "seemed to find the activity easy"] },
        { "id": "l28", "stem": "Before starting an origami activity, it is important for the teacher to", "type": "single_choice", "options": ["make models that demonstrate the different stages", "check children understand the terminology involved", "tell children not to worry if they find the activity difficult"] },
        { "id": "l29", "stem": "Teachers may be unwilling to use origami because", "type": "single_choice", "options": ["they may not think that crafts are important", "they may not have the necessary skills", "they may worry that it will take up too much time"] },
        { "id": "l30", "stem": "Students decide to use origami in maths teaching practice", "type": "single_choice", "options": ["to correct a particular misunderstanding", "to set a challenge", "to introduce a new concept"] },

        { "id": "l31", "stem": "We know more about its overall _____ than about its author", "type": "text" },
        { "id": "l32", "stem": "He spoke publicly about social issues, such as _____ and education", "type": "text" },
        { "id": "l33", "stem": "Victor Hugo had to live elsewhere in _____", "type": "text" },
        { "id": "l34", "stem": "Sale of some _____ he had written", "type": "text" },
        { "id": "l35", "stem": "The ground floor contains portraits, _____ and tapestries", "type": "text" },
        { "id": "l36", "stem": "He bought cheap _____ made of wood", "type": "text" },
        { "id": "l37", "stem": "Wallpaper and _____ that have a Chinese design", "type": "text" },
        { "id": "l38", "stem": "A view of the _____", "type": "text" },
        { "id": "l39", "stem": "He entertained other writers as well as poor _____", "type": "text" },
        { "id": "l40", "stem": "Victor Hugos _____ gave ownership of the house to the city of Paris", "type": "text" }
      ]
    }'::jsonb AS listening_json
)
UPDATE public.mock_skill_exam_defs d
SET
  content_public = jsonb_set(d.content_public, '{listening}', (SELECT listening_json FROM listening_payload), true),
  updated_at = NOW()
WHERE d.slug = 'ielts-full-mock-1';

WITH ans AS (
  SELECT
    '{
      "l1":"receptionist","l2":"medical","l3":"chastons","l4":"appointments","l5":"database",
      "l6":"experience","l7":"confident","l8":"temporary","l9":"1.15","l10":"parking",
      "l11":"B","l12":"A","l13":"A","l14":"C","l15":"F","l16":"G","l17":"E","l18":"A","l19":"C","l20":"A",
      "l21":"B","l22":"D","l23":"D","l24":"A","l25":"C","l26":"G","l27":"F","l28":"A","l29":"B","l30":"C",
      "l31":"plot","l32":"poverty","l33":"europe","l34":"poetry","l35":"drawings",
      "l36":"furniture","l37":"lamps","l38":"harbour","l39":"children","l40":"relatives"
    }'::jsonb AS listening_answers
)
UPDATE public.mock_skill_exam_answers a
SET
  answers = jsonb_set(a.answers, '{listening}', (SELECT listening_answers FROM ans), true),
  updated_at = NOW()
FROM public.mock_skill_exam_defs d
WHERE d.id = a.exam_id
  AND d.slug = 'ielts-full-mock-1';
